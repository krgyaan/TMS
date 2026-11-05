import { Module } from "@nestjs/common";
import { FollowUpModule } from "@/modules/follow-up/follow-up.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { AccountChecklistModule } from "@/modules/accounts/account-checklist/account-checklist.module";
import { FixedExpensesModule } from "@/modules/accounts/fixed-expenses/fixed-expenses.module";
import { LoggerModule } from "@/logger/logger.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";
import { FollowupScheduler } from "./follow-up.scheduler";
import { EmailModule } from "@/modules/email/email.module";
import { EmailRetryCron } from "./email-retry.scheduler";
import { AccountChecklistScheduler } from "./account-checklist.scheduler";
import { PaymentReminderScheduler } from "./payment-reminder.scheduler";
import { FixedExpenseMakerRequestScheduler } from "./fixed-expense-maker-request.scheduler";
import { FixedExpenseHistoryRolloverScheduler } from "./fixed-expense-history-rollover.scheduler";

@Module({
    imports: [
        // FollowUpModule,
        QueueModule,
        AccountChecklistModule,
        FixedExpensesModule,
        LoggerModule,
        PaymentRequestsModule,
        EmailModule,
    ],
    providers: [
        // FollowupScheduler,
        AccountChecklistScheduler,
        PaymentReminderScheduler,
        EmailRetryCron,
        FixedExpenseMakerRequestScheduler,
        FixedExpenseHistoryRolloverScheduler,
    ],
})
export class SchedulerModule {}
