import { Module } from "@nestjs/common";
import { AmcBillingController } from "./amc-billing.controller";
import { AmcBillingService } from "./amc-billing.service";

@Module({
    controllers: [AmcBillingController],
    providers: [AmcBillingService],
    exports: [AmcBillingService],
})
export class AmcBillingModule {}
