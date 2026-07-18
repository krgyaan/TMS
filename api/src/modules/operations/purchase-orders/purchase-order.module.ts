import { DatabaseModule } from "@/db/database.module";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { ClientDirectoryModule } from "@/modules/shared/client-directory/client-directory.module";
import { Module } from "@nestjs/common";
import { PurchaseOrderController } from "./purchase-order.controller";
import { PurchaseOrderService } from "./purchase-order.service";

@Module({
    imports: [DatabaseModule, ClientDirectoryModule],
    providers: [PurchaseOrderService, PdfGeneratorService],
    controllers: [PurchaseOrderController],
    exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
