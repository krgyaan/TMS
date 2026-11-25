import { Module } from "@nestjs/common";
import { OfficeInventoryController } from "./office-inventory.controller";
import { OfficeInventoryService } from "./office-inventory.service";

@Module({
    controllers: [OfficeInventoryController],
    providers: [OfficeInventoryService],
    exports: [OfficeInventoryService],
})
export class OfficeInventoryModule {}
