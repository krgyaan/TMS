import { Module } from "@nestjs/common";
import { CourierController } from "@/modules/courier/courier.controller";
import { CourierService } from "@/modules/courier/courier.service";
import { MailerService } from "@/mailer/mailer.service";
import { MailerModule } from "@/mailer/mailer.module";
import { GoogleService } from "@/modules/integrations/google/google.service";
import { CoreModule } from "@/core/core.module";
import { GoogleIntegrationModule } from "@/modules/integrations/google/google.module";

@Module({
    imports: [MailerModule, CoreModule, GoogleIntegrationModule],
    controllers: [CourierController],
    providers: [CourierService, MailerService, GoogleService],
    exports: [CourierService],
})
export class CourierModule {}
