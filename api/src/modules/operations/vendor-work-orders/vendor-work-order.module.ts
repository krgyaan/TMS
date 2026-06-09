import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { PdfGeneratorModule } from "@/modules/pdf/pdf-generator.module";
import { VendorWorkOrderController } from "./vendor-work-order.controller";
import { VendorWorkOrderService } from "./vendor-work-order.service";

@Module({
    imports: [DatabaseModule, PdfGeneratorModule],
    controllers: [VendorWorkOrderController],
    providers: [VendorWorkOrderService],
    exports: [VendorWorkOrderService],
})
export class VendorWorkOrderModule {}
