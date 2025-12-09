import { Module } from "@nestjs/common";
import { CourierController } from "./courier.controller";
import { CourierService } from "./courier.service";
import { MailerModule } from "src/mailer/mailer.module";

@Module({
    imports: [MailerModule],
    controllers: [CourierController],
    providers: [CourierService],
    exports: [CourierService],
})
export class CourierModule {}
