import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { LeadFollowupsService } from "./leadfollowups.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { startHeartbeat } from "@/infra/queue/worker-heartbeat";

@Injectable()
export class LeadFollowupWorker implements OnModuleInit {
    constructor(
        private readonly leadFollowupsService: LeadFollowupsService,
        private readonly configService: ConfigService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
    ) {}

    onModuleInit() {
        const host = this.configService.get<string>("redis.host");
        const port = this.configService.get<number>("redis.port");

        startHeartbeat({ key: "worker:lead-followup", host, port, queue: "lead-followup-mail-queue" });

        const worker = new Worker(
            "lead-followup-mail-queue",
            async job => {
                const { followupId } = job.data;

                this.logger.info("Processing lead follow-up mail job", {
                    jobId: job.id,
                    followupId,
                });

                try {
                    await this.leadFollowupsService.processLeadFollowupMail(followupId);

                    this.logger.info("Lead follow-up mail job completed", {
                        jobId: job.id,
                        followupId,
                    });
                } catch (err: any) {
                    this.logger.error("Lead follow-up mail job failed", {
                        jobId: job.id,
                        followupId,
                        error: err.message,
                        stack: err.stack,
                    });
                    throw err;
                }
            },
            {
                connection: { host, port },
                concurrency: 2,
            },
        );

        worker.on("failed", (job, err) => {
            this.logger.error("BullMQ job failed", {
                jobId: job?.id,
                error: err.message,
            });
        });

        this.logger.info("Lead followup worker started and listening to queue");
    }
}