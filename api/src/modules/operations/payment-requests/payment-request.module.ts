import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { OpenwaModule } from "@/openwa/openwa.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { PaymentRequestController } from "./payment-request.controller";
import { PaymentRequestService } from "./payment-request.service";

@Module({
    imports: [DatabaseModule, InsurancePolicyModule, OpenwaModule, NotificationsModule],
    controllers: [PaymentRequestController],
    providers: [PaymentRequestService],
    exports: [PaymentRequestService],
})
export class PaymentRequestModule {}
