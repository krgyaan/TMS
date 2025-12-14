import { Module } from "@nestjs/common";
import { MailerService } from "@/mailer/mailer.service";
import { MailerController } from "@/mailer/mailer.controller";

@Module({
    providers: [MailerService],
    controllers: [MailerController], // optional
    exports: [MailerService], // allow other modules to use it
})
export class MailerModule { }
