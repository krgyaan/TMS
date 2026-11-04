import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";
import { UNIT_OPTIONS } from "./conversion-rules";

export const itemSchema = z.object({
    itemName: z.string().trim().min(1).max(120),
    itemType: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    specifications: z.record(z.string().trim().max(200)).default({}),
    unit: z.enum(UNIT_OPTIONS),
    conversionUnit: z.enum(UNIT_OPTIONS).nullable().optional(),
    conversionFactor: z.string().nullable().optional(),
    hsnCode: z.string().trim().max(30).nullable().optional(),
    isActive: z.boolean().default(true),
});

const updateSchema = itemSchema.partial();
const teamId = 5;

@Controller("accounts/item-master")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AccountsInventoryItemsController {
    constructor(private readonly service: InventoryItemsService) {}

    @Get()
    @CanRead("accounts.item-master")
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("itemName") itemName?: string, @Query("unit") unit?: string, @Query("isActive") isActive?: string) {
        return this.service.findAll({ teamId, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, itemName, unit, isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true" });
    }

    @Get(":id")
    @CanRead("accounts.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id, teamId); }

    @Post()
    @CanCreate("accounts.item-master")
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: unknown) { return this.service.create(itemSchema.parse(body), teamId); }

    @Patch(":id")
    @CanUpdate("accounts.item-master")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) { return this.service.update(id, updateSchema.parse(body), teamId); }

    @Delete(":id")
    @CanDelete("accounts.item-master")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) { await this.service.softDelete(id, teamId); }
}
