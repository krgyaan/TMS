import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { redisConnection } from "@/config/redis.config";
import { AccountChecklistService } from "./account-checklist.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class AccountChecklistWorker implements OnModuleInit {
    constructor(
        private readonly service: AccountChecklistService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    onModuleInit() {
        const worker = new Worker(
            "checklist-mail-queue",
            async (job) => {
                this.logger.info("Processing checklist mail job", {
                    jobId: job.id,
                });

                try {
                    await this.service.processChecklistMail(job.data, job.name);

                    this.logger.info("Checklist mail job completed", {
                        jobId: job.id,
                    });
                } catch (err: any) {
                    this.logger.error("Checklist mail job failed", {
                        jobId: job.id,
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
            this.logger.error("BullMQ checklist job failed", {
                jobId: job?.id,
                error: err.message,
            });
        });

        this.logger.info("Account Checklist worker started and listening to checklist-mail-queue");
    }
}
