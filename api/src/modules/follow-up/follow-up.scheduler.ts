import { Injectable, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { FollowUpService } from "./follow-up.service";
import { getFollowupWindow } from "./follow-up.windows";
import { Queue } from "bullmq";
import { AppLogger } from "@/logger/app-logger.service";
import { getIstDateKey, getIstTimeKey } from "@/utils/ist-date";

@Injectable()
export class FollowupScheduler {
    private readonly logger;
    private running = false;

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
        if (this.running) {
            this.logger.warn("Previous follow-up scheduler run still in progress, skipping this minute");
            return;
        }

        this.running = true;

        try {
            const now = new Date();
            const window = getFollowupWindow(now);
            if (!window) return;

            const slot = `${getIstDateKey(now)}T${getIstTimeKey(now)}`;

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
                    { followupId: fu.id, frequency: window.frequency, slot },
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
            });
            throw error;
        } finally {
            this.running = false;
        }
    }
}
