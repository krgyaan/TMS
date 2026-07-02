import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@/db/database.module";
import { AccountChecklistModule } from "./account-checklist.module";
import { AccountChecklistWorker } from "./account-checklist.worker";
import { LoggerModule } from "@/logger/logger.module";

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
        LoggerModule,
        AccountChecklistModule,
    ],
    providers: [AccountChecklistWorker],
})
export class AccountChecklistWorkerModule {}
