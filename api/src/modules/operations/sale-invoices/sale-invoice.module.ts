import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { SaleInvoiceController } from "./sale-invoice.controller";
import { SaleInvoiceService } from "./sale-invoice.service";

@Module({
    imports: [DatabaseModule],
    controllers: [SaleInvoiceController],
    providers: [SaleInvoiceService],
    exports: [SaleInvoiceService],
})
export class SaleInvoiceModule {}
