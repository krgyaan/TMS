import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { trainingVideos } from "@/db/schemas/hrms/training-videos.schema";
import { eq } from "drizzle-orm";
import ffmpeg from "fluent-ffmpeg";
import * as ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import * as ffprobeInstaller from "@ffprobe-installer/ffprobe";
import * as path from "path";
import * as fs from "fs";


@Injectable()
export class VideoProcessingWorker implements OnModuleInit {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly configService: ConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    onModuleInit() {
        const host = this.configService.get<string>('redis.host');
        const port = this.configService.get<number>('redis.port');

        const worker = new Worker(
            "video-processing-queue",
            async job => {
                const { videoId, filepath } = job.data;

                this.logger.info("Processing training video", {
                    jobId: job.id,
                    videoId,
                    filepath,
                });

                try {
                    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
                    ffmpeg.setFfprobePath(ffprobeInstaller.path);

                    const metadata: any = await new Promise((resolveProj, rejectProj) => {
                        ffmpeg.ffprobe(filepath, (err, data) => {
                            if (err) rejectProj(err);
                            else resolveProj(data);
                        });
                    });

                    const durationSeconds = Math.round(metadata.format.duration || 15);
                    let resolution = "1280x720";
                    const videoStream = metadata.streams.find((s: any) => s.codec_type === "video");
                    if (videoStream) {
                        resolution = `${videoStream.width}x${videoStream.height}`;
                    }

                    // ── Generate thumbnail ─────────────────────────────────────────
                    const thumbnailDir = path.join(process.cwd(), "uploads", "hrms", "training", "thumbnails");
                    if (!fs.existsSync(thumbnailDir)) {
                        fs.mkdirSync(thumbnailDir, { recursive: true });
                    }

                    const thumbnailFilename = `thumb-${videoId}-${Date.now()}.jpg`;
                    // Capture frame at 10% of video duration (min 2s)
                    const seekTime = Math.max(2, Math.floor(durationSeconds * 0.1));

                    await new Promise<void>((resolveThumb, rejectThumb) => {
                        ffmpeg(filepath)
                            .seekInput(seekTime)
                            .frames(1)
                            .size("640x?")      // 640px wide, keep aspect ratio
                            .output(path.join(thumbnailDir, thumbnailFilename))
                            .on("end", () => resolveThumb())
                            .on("error", (err: Error) => rejectThumb(err))
                            .run();
                    });

                    // Relative web path served under /uploads/*
                    const thumbnailPath = `uploads/hrms/training/thumbnails/${thumbnailFilename}`;

                    // Update video record in DB
                    await this.db
                        .update(trainingVideos)
                        .set({
                            durationSeconds,
                            resolution,
                            thumbnailPath,
                            status: "ready",
                            updatedAt: new Date(),
                        })
                        .where(eq(trainingVideos.id, videoId));

                    this.logger.info("Video processing completed successfully", {
                        videoId,
                        durationSeconds,
                        resolution,
                        thumbnailPath,
                    });
                } catch (err: any) {
                    this.logger.error("Video processing job failed", {
                        jobId: job.id,
                        videoId,
                        error: err.message,
                    });

                    // Update video record to failed
                    await this.db
                        .update(trainingVideos)
                        .set({
                            status: "failed",
                            updatedAt: new Date(),
                        })
                        .where(eq(trainingVideos.id, videoId));

                    throw err;
                }
            },
            {
                connection: { host, port },
                concurrency: 2,
            }
        );

        worker.on("failed", (job, err) => {
            this.logger.error("Video processing BullMQ job failed", {
                jobId: job?.id,
                error: err?.message,
            });
        });

        this.logger.info("Video processing worker started and listening to video-processing-queue");
    }
}
