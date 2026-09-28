import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { PdfGeneratorModule } from "@/modules/pdf/pdf-generator.module";
import { ClientDirectoryModule } from "@/modules/shared/client-directory/client-directory.module";
import { OpenwaModule } from "@/openwa/openwa.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";
import { Module } from "@nestjs/common";
import { PurchaseOrderController } from "./purchase-order.controller";
import { PurchaseOrderService } from "./purchase-order.service";

@Module({
    imports: [DatabaseModule, ClientDirectoryModule, PdfGeneratorModule, InsurancePolicyModule, OpenwaModule, CashFlowModule],
    providers: [PurchaseOrderService],
    controllers: [PurchaseOrderController],
    exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
