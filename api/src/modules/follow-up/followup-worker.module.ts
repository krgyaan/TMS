import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FollowUpModule } from "./follow-up.module";
import { FollowupWorker } from "./follow-up.worker";
import { LoggerModule } from "@/logger/logger.module";

@Module({
    imports: [ConfigModule, FollowUpModule, LoggerModule],
    providers: [FollowupWorker],
})
export class FollowupWorkerModule {}
