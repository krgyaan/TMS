import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";
import { itemSchema, parseItemBody, updateItemSchema } from "./inventory-items.controller";
import { getConversionOptions } from "./conversion-rules";

@Controller("master/item-master")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SettingsInventoryItemsController {
    constructor(private readonly service: InventoryItemsService) {}

    @Get()
    @CanRead("master.item-master")
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("teamId") teamId?: string, @Query("itemGroup") itemGroup?: string, @Query("itemName") itemName?: string, @Query("unit") unit?: string, @Query("isActive") isActive?: string) {
        return this.service.findAll({ teamId: teamId ? Number(teamId) : undefined, itemGroup, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, itemName, unit, isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true" });
    }

    @Get("conversion-options")
    @CanRead("master.item-master")
    conversionOptions(@Query("unit") unit?: string, @Query("width") width?: string) {
        return getConversionOptions(unit || "", width ? { width } : {});
    }

    @Get(":id")
    @CanRead("master.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }

    @Post()
    @CanCreate("master.item-master")
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: unknown) {
        const { teamId, ...data } = parseItemBody(itemSchema, body);
        return this.service.create(data, teamId);
    }

    @Patch(":id")
    @CanUpdate("master.item-master")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const { teamId, ...data } = parseItemBody(updateItemSchema, body);
        return this.service.update(id, data, teamId);
    }

    @Delete(":id")
    @CanDelete("master.item-master")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) { await this.service.softDelete(id); }
}
