import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";

@Controller("operations/item-master")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OperationsInventoryItemsController {
    constructor(private readonly service: InventoryItemsService) {}

    @Get()
    @CanRead("operations.item-master")
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string) {
        return this.service.findAll({ search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
    }

    @Get(":id")
    @CanRead("operations.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }

}
