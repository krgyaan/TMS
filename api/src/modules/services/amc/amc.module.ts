import { Module } from "@nestjs/common";
import { AmcController } from "./amc.controller";
import { AmcService } from "./amc.service";
import { AmcBillingModule } from "@/modules/services/amc-billing/amc-billing.module";

@Module({
    imports: [AmcBillingModule],
    controllers: [AmcController],
    providers: [AmcService],
    exports: [AmcService],
})
export class AmcModule {}