import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";

export { itemSchema, updateItemSchema, parseItemBody } from "./dto/inventory-items.dto";

@Controller("accounts/item-master")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AccountsInventoryItemsController {
    constructor(private readonly service: InventoryItemsService) {}

    @Get()
    @CanRead("accounts.item-master")
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("teamId") teamId?: string, @Query("itemGroup") itemGroup?: string, @Query("itemName") itemName?: string, @Query("unit") unit?: string, @Query("isActive") isActive?: string) {
        return this.service.findAll({ teamId: teamId ? Number(teamId) : undefined, itemGroup, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, itemName, unit, isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true" });
    }

    @Get(":id")
    @CanRead("accounts.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }

}
