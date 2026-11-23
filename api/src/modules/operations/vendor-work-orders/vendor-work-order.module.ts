import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { PdfGeneratorModule } from "@/modules/pdf/pdf-generator.module";
import { VendorWorkOrderController } from "./vendor-work-order.controller";
import { VendorWorkOrderService } from "./vendor-work-order.service";
import { OpenwaModule } from "@/openwa/openwa.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";
import { PurchaseOrderModule } from "@/modules/operations/purchase-orders/purchase-order.module";

@Module({
    imports: [DatabaseModule, PdfGeneratorModule, InsurancePolicyModule, OpenwaModule, CashFlowModule, PurchaseOrderModule],
    controllers: [VendorWorkOrderController],
    providers: [VendorWorkOrderService],
    exports: [VendorWorkOrderService],
})
export class VendorWorkOrderModule {}
