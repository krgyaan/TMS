import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { PaymentRequestController } from "./payment-request.controller";
import { PaymentRequestService } from "./payment-request.service";

@Module({
    imports: [DatabaseModule, InsurancePolicyModule],
    controllers: [PaymentRequestController],
    providers: [PaymentRequestService],
    exports: [PaymentRequestService],
})
export class PaymentRequestModule {}
