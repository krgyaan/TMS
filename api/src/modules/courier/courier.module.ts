import { Module } from "@nestjs/common";
import { CourierController } from "@/modules/courier/courier.controller";
import { CourierService } from "@/modules/courier/courier.service";
import { MailerService } from "@/mailer/mailer.service";
import { MailerModule } from "@/mailer/mailer.module";
import { GoogleService } from "@/modules/integrations/google/google.service";

@Module({
    imports: [MailerModule],
    controllers: [CourierController],
    providers: [CourierService, MailerService, GoogleService],
    exports: [CourierService],
})
export class CourierModule {}
