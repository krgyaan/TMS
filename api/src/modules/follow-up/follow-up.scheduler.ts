import { Injectable, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { FollowUpService } from "./follow-up.service";
import { FOLLOWUP_WINDOWS } from "./follow-up.windows";
import { Queue } from "bullmq";
import { AppLogger } from "@/logger/app-logger.service";
import { getIstDateKey, getIstTimeKey } from "@/utils/ist-date";

@Injectable()
export class FollowupScheduler {
    private readonly logger;

    constructor(
        @Inject("FOLLOWUP_QUEUE")
        private readonly queue: Queue,
        private followUpService: FollowUpService,
        private readonly appLogger: AppLogger
    ) {
        this.logger = this.appLogger.withContext(FollowupScheduler.name);
    }

    @Cron("* * * * *")
    async handleFollowups() {
        const now = new Date();

        const window = this.getCurrentWindow(now);
        if (!window) return;

        const slot = `${getIstDateKey(now)}T${getIstTimeKey(now)}`;

        try {
            this.logger.info("Follow-up window matched", {
                frequency: window.frequency,
                slot,
                hour: window.hour,
                minute: window.minute,
            });

            const followups = await this.followUpService.getDueFollowupsForCurrentWindow(window.frequency);

            this.logger.info("Found follow-ups to enqueue", {
                frequency: window.frequency,
                count: followups.length,
                slot,
            });

            this.logger.debug("Due follow-up ids", {
                followupIds: followups.map(f => f.id),
                frequency: window.frequency,
                slot,
            });

            for (const fu of followups) {
                const jobId = `followup-${fu.id}-${window.frequency}-${slot}`;

                this.logger.debug("Enqueuing follow-up mail job", {
                    followupId: fu.id,
                    jobId,
                    frequency: window.frequency,
                    slot,
                });

                await this.queue.add(
                    "send-followup",
                    { followupId: fu.id },
                    {
                        jobId,
                        attempts: 5,
                        backoff: { type: "exponential", delay: 30000 },
                    }
                );
            }
        } catch (error) {
            this.logger.error("Failed to enqueue follow-up mails", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                frequency: window.frequency,
                slot,
            });
            throw error;
        }
    }

    private getCurrentWindow(date: Date) {
        const day = date.getDay(); // 0-6
        const hour = date.getHours();
        const minute = date.getMinutes();

        return FOLLOWUP_WINDOWS.find(w => {
            const basicMatch = w.hour === hour && w.minute === minute && w.days.includes(day);
            if (!basicMatch) return false;
            if (w.customCheck && !w.customCheck(date)) return false;
            return true;
        });
    }
}
