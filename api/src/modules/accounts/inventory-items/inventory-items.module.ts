import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { InventoryItemsController } from "./inventory-items.controller";
import { InventoryItemsService } from "./inventory-items.service";

@Module({
    imports: [DatabaseModule],
    controllers: [InventoryItemsController],
    providers: [InventoryItemsService],
})
export class InventoryItemsModule {}
