import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MailerController } from "./mailer.controller";
import { MailerService } from "./mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";
import { GoogleIntegrationModule } from "@/modules/integrations/google/google.module";
import googleConfig from "@config/google.config";
@Module({
    controllers: [MailerController],
    imports: [GoogleIntegrationModule, ConfigModule.forFeature(googleConfig)],
    providers: [MailerService, GoogleService],
    exports: [MailerService],
})
export class MailerModule {}
