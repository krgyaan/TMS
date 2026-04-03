import { Module } from "@nestjs/common";
import { AccountChecklistModule } from "./account-checklist.module";
import { AccountChecklistScheduler } from "./account-checklist.scheduler";
import { QueueModule } from "@/infra/queue/queue.module";
import { LoggerModule } from "@/logger/logger.module";

@Module({
    imports: [
        AccountChecklistModule, 
        QueueModule,
        LoggerModule
    ],
    providers: [AccountChecklistScheduler],
})
export class AccountChecklistSchedulerModule {}
