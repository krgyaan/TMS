import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PaymentRequestsNotificationService } from "@/modules/tendering/payment-requests/services/payment-requests-notification.service";

@Injectable()
export class PaymentReminderScheduler {
    private readonly logger = new Logger(PaymentReminderScheduler.name);

    constructor(
        private readonly notificationService: PaymentRequestsNotificationService,
    ) {}

    // Cheque due date reminder: Mon-Fri 17:10
    @Cron("10 17 * * 1-5")
    async handleChequeDueDateReminder() {
        this.logger.log("Running cheque due date reminder...");
        try {
            await this.notificationService.processChequeDueDateReminders();
            this.logger.log("Cheque due date reminders processed successfully");
        } catch (error: any) {
            this.logger.error("Cheque due date reminder failed", error instanceof Error ? error.stack : String(error));
        }
    }

    // BG claim period check: Mon-Fri 16:20
    @Cron("20 16 * * 1-5")
    async handleBgClaimPeriod() {
        this.logger.log("Running BG claim period check...");
        try {
            await this.notificationService.processBgClaimPeriodReminders();
            this.logger.log("BG claim period reminders processed successfully");
        } catch (error: any) {
            this.logger.error("BG claim period reminder failed", error instanceof Error ? error.stack : String(error));
        }
    }

    // BG expiry reminder: Mon-Fri 17:20
    @Cron("20 17 * * 1-5")
    async handleBgExpiryReminder() {
        this.logger.log("Running BG expiry reminder...");
        try {
            await this.notificationService.processBgExpiryReminders();
            this.logger.log("BG expiry reminders processed successfully");
        } catch (error: any) {
            this.logger.error("BG expiry reminder failed", error instanceof Error ? error.stack : String(error));
        }
    }
}
