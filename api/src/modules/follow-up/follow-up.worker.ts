import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { redisConnection } from "@/config/redis.config";
import { FollowUpService } from "./follow-up.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class FollowupWorker implements OnModuleInit {
    constructor(
        private readonly followUpService: FollowUpService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) { }

    onModuleInit() {
        const worker = new Worker(
            "followup-mail-queue",
            async job => {
                const { followupId } = job.data;

                this.logger.info("Processing follow-up mail job", {
                    jobId: job.id,
                    followupId,
                });

                try {
                    await this.followUpService.processFollowupMail(followupId);

                    this.logger.info("Follow-up mail job completed", {
                        jobId: job.id,
                        followupId,
                    });
                } catch (err: any) {
                    this.logger.error("Follow-up mail job failed", {
                        jobId: job.id,
                        followupId,
                        error: err.message,
                        stack: err.stack,
                    });
                    throw err;
                }
            },
            {
                connection: redisConnection,
                concurrency: 2,
            }
        );

        worker.on("failed", (job, err) => {
            this.logger.error("BullMQ job failed", {
                jobId: job?.id,
                error: err.message,
            });
        });

        this.logger.info("Followup worker started and listening to queue");
    }
}
