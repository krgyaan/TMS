import { Module } from "@nestjs/common";
import { QueueModule } from "@/infra/queue/queue.module";
import { AccountChecklistModule } from "@/modules/accounts/account-checklist/account-checklist.module";
import { LoggerModule } from "@/logger/logger.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";
import { EmailModule } from "@/modules/email/email.module";
import { EmailRetryCron } from "@/modules/email/cron/email-retry.cron";
import { AccountChecklistScheduler } from "./account-checklist.scheduler";
import { PaymentReminderScheduler } from "./payment-reminder.scheduler";

@Module({
    imports: [
        QueueModule,
        AccountChecklistModule,
        LoggerModule,
        PaymentRequestsModule,
        EmailModule,
    ],
    providers: [
        AccountChecklistScheduler,
        PaymentReminderScheduler,
        EmailRetryCron,
    ],
})
export class SchedulerModule {}
