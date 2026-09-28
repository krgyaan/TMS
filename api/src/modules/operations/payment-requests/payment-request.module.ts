import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { OpenwaModule } from "@/openwa/openwa.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";
import { PaymentRequestController } from "./payment-request.controller";
import { PaymentRequestService } from "./payment-request.service";

@Module({
    imports: [DatabaseModule, InsurancePolicyModule, OpenwaModule, NotificationsModule, CashFlowModule],
    controllers: [PaymentRequestController],
    providers: [PaymentRequestService],
    exports: [PaymentRequestService],
})
export class PaymentRequestModule {}
