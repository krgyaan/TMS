import { Module } from "@nestjs/common";
import { MailerController } from "./mailer.controller";
import { MailerService } from "./mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";

@Module({
    controllers: [MailerController],
    providers: [MailerService, GoogleService],
    exports: [MailerService],
})
export class MailerModule {}
