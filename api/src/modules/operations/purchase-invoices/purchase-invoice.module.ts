import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";
import { PurchaseInvoiceController } from "./purchase-invoice.controller";
import { PurchaseInvoiceService } from "./purchase-invoice.service";

@Module({
    imports: [DatabaseModule, CashFlowModule],
    controllers: [PurchaseInvoiceController],
    providers: [PurchaseInvoiceService],
    exports: [PurchaseInvoiceService],
})
export class PurchaseInvoiceModule {}
