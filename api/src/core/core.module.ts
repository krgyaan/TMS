import { Module } from "@nestjs/common";
import { MailAudienceService } from "./mail/mail-audience.service";

@Module({
    providers: [MailAudienceService],
    exports: [MailAudienceService],
})
export class CoreModule {}
