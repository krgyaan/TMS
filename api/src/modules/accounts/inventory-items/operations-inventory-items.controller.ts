import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";
import { itemSchema } from "./inventory-items.controller";

const updateSchema = itemSchema.partial();
const teamId = 3;

@Controller("operations/item-master")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OperationsInventoryItemsController {
    constructor(private readonly service: InventoryItemsService) {}

    @Get()
    @CanRead("operations.item-master")
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("itemName") itemName?: string, @Query("unit") unit?: string, @Query("isActive") isActive?: string) {
        return this.service.findAll({ teamId, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, itemName, unit, isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true" });
    }

    @Get(":id")
    @CanRead("operations.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id, teamId); }

    @Post()
    @CanCreate("operations.item-master")
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: unknown) { return this.service.create(itemSchema.parse(body), teamId); }

    @Patch(":id")
    @CanUpdate("operations.item-master")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) { return this.service.update(id, updateSchema.parse(body), teamId); }

    @Delete(":id")
    @CanDelete("operations.item-master")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) { await this.service.softDelete(id, teamId); }
}
