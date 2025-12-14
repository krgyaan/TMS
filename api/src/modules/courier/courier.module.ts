import { Module } from "@nestjs/common";
import { CourierController } from "@/modules/courier/courier.controller";
import { CourierService } from "@/modules/courier/courier.service";
import { MailerModule } from "@/mailer/mailer.module";

@Module({
    imports: [MailerModule],
    controllers: [CourierController],
    providers: [CourierService],
    exports: [CourierService],
})
export class CourierModule {}
