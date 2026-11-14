import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { InventoryItemsService } from "./inventory-items.service";
import { itemSchema, parseItemBody, updateItemSchema } from "./inventory-items.controller";
import { getConversionOptions } from "./conversion-rules";
import { getAllowedConversionPairs } from "./item-catalog";
import { z } from "zod";

const itemCodePreviewSchema = z.object({
    category: z.string().trim().min(1).max(80),
    itemName: z.string().trim().min(1).max(120),
    specifications: z.record(z.string(), z.string().trim().max(200)).default({}),
});

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
    conversionOptions(@Query("unit") unit?: string, @Query("width") width?: string, @Query("category") category?: string, @Query("itemName") itemName?: string, @Query("type") type?: string) {
        const specifications = { ...(width ? { width } : {}), ...(type ? { type } : {}) };
        return getConversionOptions(unit || "", specifications, category && itemName ? getAllowedConversionPairs(category, itemName, specifications) : undefined);
    }

    @Post("code-preview")
    @CanRead("master.item-master")
    previewCode(@Body() body: unknown) {
        const parsed = itemCodePreviewSchema.safeParse(body);
        if (!parsed.success) throw new BadRequestException(parsed.error.issues.map(issue => `${issue.path.join(".") || "item"}: ${issue.message}`).join("; "));
        return this.service.previewItemCode(parsed.data);
    }

    @Get(":id")
    @CanRead("master.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }

    @Post()
    @CanCreate("master.item-master")
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: unknown, @CurrentUser("id") authenticatedUserId: number) {
        return this.service.create(parseItemBody(itemSchema, body), authenticatedUserId);
    }

    @Patch(":id")
    @CanUpdate("master.item-master")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @CurrentUser("id") authenticatedUserId: number) {
        return this.service.update(id, parseItemBody(updateItemSchema, body), authenticatedUserId);
    }

    @Delete(":id")
    @CanDelete("master.item-master")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) { await this.service.softDelete(id); }
}
