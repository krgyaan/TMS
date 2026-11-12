import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { AccountsInventoryItemsController } from "./inventory-items.controller";
import { OperationsInventoryItemsController } from "./operations-inventory-items.controller";
import { SettingsInventoryItemsController } from "./settings-inventory-items.controller";
import { InventoryItemsController } from "./inventory-items.controller";
import { InventoryItemsService } from "./inventory-items.service";

@Module({
    imports: [DatabaseModule],
    controllers: [AccountsInventoryItemsController, OperationsInventoryItemsController, SettingsInventoryItemsController],
    controllers: [InventoryItemsController],
    providers: [InventoryItemsService],
})
export class InventoryItemsModule {}
