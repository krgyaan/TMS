import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import { Queue } from "bullmq";

@Injectable()
export class FollowupScheduler {
    private readonly logger = new Logger(FollowupScheduler.name);

    constructor(
        @Inject("FOLLOWUP_QUEUE")
        private readonly queue: Queue,
        private followUpService: FollowUpService
    ) {}

    private async enqueueFollowups(frequency: number) {
        const followups = await this.followUpService.getDueFollowupsForCurrentWindow(frequency);
        this.logger.log(`Found ${followups.length} followups to enqueue for frequency ${frequency}`);

        for (const fu of followups) {
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

    // Frequency 1 - Daily (Mon-Sat) at 10:10
    @Cron("10 10 * * 1-6")
    async handleDaily() {
        await this.enqueueFollowups(1);
    }

    // Frequency 2 - Alternate Days (Mon-Sat) at 10:15
    @Cron("15 10 * * 1-6")
    async handleAlternateDays() {
        await this.enqueueFollowups(2);
    }

    // Frequency 3 - Twice Daily (Mon-Sat) at 10:25 & 16:25
    @Cron("25 10 * * 1-6")
    async handleTwiceDailyMorning() {
        await this.enqueueFollowups(3);
    }

    @Cron("25 16 * * 1-6")
    async handleTwiceDailyEvening() {
        await this.enqueueFollowups(3);
    }

    // Frequency 4 - Weekly (Every Monday) at 10:20
    @Cron("20 10 * * 1")
    async handleWeekly() {
        await this.enqueueFollowups(4);
    }

    // Frequency 5 - Twice a Week (Mon & Thu) at 10:30
    @Cron("30 10 * * 1,4")
    async handleTwiceWeekly() {
        await this.enqueueFollowups(5);
    }

    // Frequency 7 - Alternate Mondays at 10:35
    @Cron("35 10 * * 1")
    async handleAlternateMondays() {
        const now = new Date();
        const ref = new Date(2026, 0, 5);
        ref.setHours(0, 0, 0, 0);
        const curr = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        curr.setHours(0, 0, 0, 0);
        const diffWeeks = Math.round((curr.getTime() - ref.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (diffWeeks % 2 !== 0) return;

        await this.enqueueFollowups(7);
    }

    // Frequency 8 - First Monday of the Month at 10:40
    @Cron("40 10 * * 1")
    async handleFirstMonday() {
        const now = new Date();
        if (now.getDate() > 7) return;

        await this.enqueueFollowups(8);
    }
}
