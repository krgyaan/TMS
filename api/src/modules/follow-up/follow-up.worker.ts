import { Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { redisConnection } from "@/config/redis.config";
import { MailerService } from "@/mailer/mailer.service";
import { FollowUpService } from "./follow-up.service";

@Injectable()
export class FollowupWorker implements OnModuleInit {
    constructor(private readonly followUpService: FollowUpService) {}

    onModuleInit() {
        const worker = new Worker(
            "followup-mail-queue",
            async job => {
                const { followupId } = job.data;

                try {
                    await this.followUpService.processFollowupMail(followupId);
                } catch (err) {
                    console.error("Mail failed", err);
                    throw err;
                }
            },
            {
                connection: redisConnection,
                concurrency: 2,
            }
        );

        worker.on("failed", (job, err) => {
            console.error("Job failed", job?.id, err);
        });

        console.log("✅ Followup worker started");
    }
}
