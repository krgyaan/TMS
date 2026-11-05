import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";

const ITEM_UNITS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."] as const;

export const itemSchema = z.object({
    teamId: z.number().int().positive(),
    itemName: z.string().trim().min(1).max(120),
    itemType: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    specifications: z.record(z.string(), z.string().trim().max(200)).default({}),
    unit: z.enum(ITEM_UNITS),
    hsnCode: z.string().trim().max(30).nullable().optional(),
    isActive: z.boolean().default(true),
});

export const updateItemSchema = itemSchema.partial();

export const parseItemBody = <T extends z.ZodType>(schema: T, body: unknown): z.infer<T> => {
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new BadRequestException(result.error.issues.map(issue => `${issue.path.join(".") || "item"}: ${issue.message}`).join("; "));
    }
    return result.data;
};

@Controller("accounts/item-master")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AccountsInventoryItemsController {
    constructor(private readonly service: InventoryItemsService) {}

    @Get()
    @CanRead("accounts.item-master")
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("teamId") teamId?: string, @Query("itemName") itemName?: string, @Query("unit") unit?: string, @Query("isActive") isActive?: string) {
        return this.service.findAll({ teamId: teamId ? Number(teamId) : undefined, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, itemName, unit, isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true" });
    }

    @Get(":id")
    @CanRead("accounts.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }

    @Post()
    @CanCreate("accounts.item-master")
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: unknown) {
        const { teamId, ...data } = parseItemBody(itemSchema, body);
        return this.service.create(data, teamId);
    }

    @Patch(":id")
    @CanUpdate("accounts.item-master")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = parseItemBody(updateItemSchema, body);
        const { teamId, ...data } = parsed;
        return this.service.update(id, data, teamId);
    }

    @Delete(":id")
    @CanDelete("accounts.item-master")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) { await this.service.softDelete(id); }
}
