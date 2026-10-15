import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";
import { PurchaseOrderModule } from "@/modules/operations/purchase-orders/purchase-order.module";
import { VendorWorkOrderModule } from "@/modules/operations/vendor-work-orders/vendor-work-order.module";
import { PurchaseInvoiceController } from "./purchase-invoice.controller";
import { PurchaseInvoiceService } from "./purchase-invoice.service";

@Module({
    imports: [DatabaseModule, CashFlowModule, PurchaseOrderModule, VendorWorkOrderModule],
    controllers: [PurchaseInvoiceController],
    providers: [PurchaseInvoiceService],
    exports: [PurchaseInvoiceService],
})
export class PurchaseInvoiceModule {}
