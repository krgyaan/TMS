import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Queue } from "bullmq";

@Injectable()
export class PaymentReminderScheduler {
    private readonly logger = new Logger(PaymentReminderScheduler.name);

    constructor(
        @Inject("GENERIC_QUEUE")
        private readonly queue: Queue,
    ) {}

    // Cheque due date reminder: Mon-Fri 17:10
    @Cron("10 17 * * 1-5")
    async handleChequeDueDateReminder() {
        await this.queue.add("cheque_due_date", { type: "cheque_due_date" }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 30000 },
        });
    }

    // BG claim period check: Mon-Fri 16:20
    @Cron("20 16 * * 1-5")
    async handleBgClaimPeriod() {
        await this.queue.add("bg_claim_period", { type: "bg_claim_period" }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 30000 },
        });
    }

    // BG expiry reminder: Mon-Fri 17:20
    @Cron("20 17 * * 1-5")
    async handleBgExpiryReminder() {
        await this.queue.add("bg_expiry", { type: "bg_expiry" }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 30000 },
        });
    }
}