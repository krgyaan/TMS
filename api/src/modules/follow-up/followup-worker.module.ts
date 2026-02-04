import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@/db/database.module";
import { GoogleIntegrationModule } from "@/modules/integrations/google/google.module";
import { MailerModule } from "@/mailer/mailer.module";
import { FollowUpModule } from "./follow-up.module";
import { FollowupWorker } from "./follow-up.worker";
import { FollowUpService } from "./follow-up.service";
import { LoggerModule } from "@/logger/logger.module";

@Module({
    imports: [ConfigModule, DatabaseModule, GoogleIntegrationModule, MailerModule, LoggerModule],
    providers: [FollowupWorker, FollowUpService],
})
export class FollowupWorkerModule {}
