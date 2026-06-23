import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { redisConnection } from "@/config/redis.config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { trainingVideos } from "@/db/schemas/hrms/training-videos.schema";
import { eq } from "drizzle-orm";

@Injectable()
export class VideoProcessingWorker implements OnModuleInit {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    onModuleInit() {
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
                    let durationSeconds = 15; // default fallback
                    let resolution = "1280x720"; // default fallback

                    try {
                        // Dynamically import fluent-ffmpeg and installers to avoid crash if not installed
                        const ffmpeg = require('fluent-ffmpeg');
                        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
                        const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

                        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
                        ffmpeg.setFfprobePath(ffprobeInstaller.path);

                        const metadata: any = await new Promise((resolveProj, rejectProj) => {
                            ffmpeg.ffprobe(filepath, (err, data) => {
                                if (err) rejectProj(err);
                                else resolveProj(data);
                            });
                        });

                        durationSeconds = Math.round(metadata.format.duration || 15);
                        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                        if (videoStream) {
                            resolution = `${videoStream.width}x${videoStream.height}`;
                        }
                    } catch (err: any) {
                        this.logger.warn("FFmpeg not available or failed. Falling back to default metadata.", { error: err.message });
                    }

                    // Update video record in DB
                    await this.db
                        .update(trainingVideos)
                        .set({
                            durationSeconds,
                            resolution,
                            status: "ready",
                            updatedAt: new Date(),
                        })
                        .where(eq(trainingVideos.id, videoId));

                    this.logger.info("Video processing completed successfully", {
                        videoId,
                        durationSeconds,
                        resolution,
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
                connection: redisConnection,
                concurrency: 1,
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
