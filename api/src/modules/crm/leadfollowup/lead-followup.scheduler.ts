import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Queue } from "bullmq";
import { LeadFollowupsService } from "./leadfollowups.service";

@Injectable()
export class LeadFollowupScheduler {
    private readonly logger = new Logger(LeadFollowupScheduler.name);

    constructor(
        @Inject("LEAD_FOLLOWUP_QUEUE")
        private readonly queue: Queue,
        private readonly leadFollowupsService: LeadFollowupsService,
    ) {}

    // Daily at 9:00 AM Mon-Sat
    @Cron("0 9 * * 1-6")
    async handleDaily() {
        this.logger.log("Lead followup scheduler: checking for due followups");

        try {
            const due = await this.leadFollowupsService.getDueLeadFollowups();
            this.logger.log(`Found ${due.length} due lead followups to enqueue`);

            for (const fu of due) {
                await this.queue.add(
                    "send-lead-followup",
                    { followupId: fu.id },
                    {
                        attempts: 5,
                        backoff: { type: "exponential", delay: 30000 },
                    },
                );
            }
        } catch (error: any) {
            this.logger.error("Lead followup scheduler error", { error: error.message });
        }
    }
}