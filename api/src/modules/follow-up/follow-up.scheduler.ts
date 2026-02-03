import { Injectable, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { FollowUpService } from "./follow-up.service";
import { FOLLOWUP_WINDOWS } from "./follow-up.windows";
import { Queue } from "bullmq";
import { QueueModule } from "@/infra/queue/queue.module";

@Injectable()
export class FollowupScheduler {
    constructor(
        @Inject("FOLLOWUP_QUEUE")
        private readonly queue: Queue,
        private followUpService: FollowUpService
    ) {}

    @Cron("* * * * *")
    async handleFollowups() {
        const now = new Date();

        const window = this.getCurrentWindow(now);
        if (!window) return;

        const followups = await this.followUpService.getDueFollowupsForCurrentWindow(window.frequency);

        console.log(`📦 Found ${followups.length} followups to enqueue`);

        console.log("Scheduler running at", new Date());

        console.log(
            "Due followups:",
            followups.map(f => f.id)
        );

        for (const fu of followups) {
            console.log(`➡️ Enqueuing followup ${fu.id}`);

            await this.queue.add(
                "send-followup",
                { followupId: fu.id },
                {
                    attempts: 5,
                    backoff: { type: "exponential", delay: 30000 },
                }
            );
        }
    }

    private getCurrentWindow(date: Date) {
        const day = date.getDay(); // 0-6
        const hour = date.getHours();
        const minute = date.getMinutes();

        return FOLLOWUP_WINDOWS.find(w => w.hour === hour && w.minute === minute && w.days.includes(day));
    }
}
