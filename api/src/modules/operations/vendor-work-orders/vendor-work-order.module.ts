import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { PdfGeneratorModule } from "@/modules/pdf/pdf-generator.module";
import { VendorWorkOrderController } from "./vendor-work-order.controller";
import { VendorWorkOrderService } from "./vendor-work-order.service";
import { OpenwaModule } from "@/openwa/openwa.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";

@Module({
    imports: [DatabaseModule, PdfGeneratorModule, InsurancePolicyModule, OpenwaModule, CashFlowModule],
    controllers: [VendorWorkOrderController],
    providers: [VendorWorkOrderService],
    exports: [VendorWorkOrderService],
})
export class VendorWorkOrderModule {}
