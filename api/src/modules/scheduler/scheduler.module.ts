import { Module } from "@nestjs/common";
import { FollowUpModule } from "@/modules/follow-up/follow-up.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { AccountChecklistModule } from "@/modules/accounts/account-checklist/account-checklist.module";
import { LoggerModule } from "@/logger/logger.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";
import { FollowupScheduler } from "./follow-up.scheduler";
import { AccountChecklistScheduler } from "./account-checklist.scheduler";
import { PaymentReminderScheduler } from "./payment-reminder.scheduler";

@Module({
    imports: [
        // FollowUpModule,
        QueueModule,
        AccountChecklistModule,
        LoggerModule,
        PaymentRequestsModule,
    ],
    providers: [
        // FollowupScheduler,
        AccountChecklistScheduler,
        PaymentReminderScheduler,
    ],
})
export class SchedulerModule {}
