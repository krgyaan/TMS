import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { PurchaseInvoiceController } from "./purchase-invoice.controller";
import { PurchaseInvoiceService } from "./purchase-invoice.service";

@Module({
    imports: [DatabaseModule],
    controllers: [PurchaseInvoiceController],
    providers: [PurchaseInvoiceService],
    exports: [PurchaseInvoiceService],
})
export class PurchaseInvoiceModule {}
