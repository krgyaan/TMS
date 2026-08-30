import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { PdfGeneratorModule } from "@/modules/pdf/pdf-generator.module";
import { VendorWorkOrderController } from "./vendor-work-order.controller";
import { VendorWorkOrderService } from "./vendor-work-order.service";
import { ClientDirectoryModule } from "@/modules/shared/client-directory/client-directory.module";

@Module({
    imports: [DatabaseModule, PdfGeneratorModule, ClientDirectoryModule, InsurancePolicyModule],
    controllers: [VendorWorkOrderController],
    providers: [VendorWorkOrderService],
    exports: [VendorWorkOrderService],
})
export class VendorWorkOrderModule {}
