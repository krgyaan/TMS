import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators/permissions.decorator";
import { InventoryItemsService } from "./inventory-items.service";
import { UNIT_OPTIONS } from "./item-catalog";

const ITEM_GROUPS = ["Raw Materials", "Finished Goods", "Supplies"] as const;
const HSN_CODE = z.string().regex(/^\d{4,8}$/, "HSN code must contain 4 to 8 digits");

export const itemSchema = z.object({
    teamId: z.number().int().positive().nullable().optional(),
    itemGroup: z.enum(ITEM_GROUPS).nullable().optional(),
    category: z.string().trim().min(1).max(80),
    itemName: z.string().trim().min(1).max(120),
    itemType: z.string().trim().max(80).nullable().optional(),
    makeBrand: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    specifications: z.record(z.string(), z.string().trim().max(200)).default({}),
    unit: z.enum(UNIT_OPTIONS),
    conversionUnit: z.enum(UNIT_OPTIONS).nullable().optional(),
    conversionFactor: z.union([z.number(), z.string()]).nullable().optional(),
    hsnCode: HSN_CODE,
    isActive: z.boolean().default(true),
});

export const updateItemSchema = itemSchema.partial().extend({ hsnCode: HSN_CODE.optional() });

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
    list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("teamId") teamId?: string, @Query("itemGroup") itemGroup?: string, @Query("itemName") itemName?: string, @Query("unit") unit?: string, @Query("isActive") isActive?: string) {
        return this.service.findAll({ teamId: teamId ? Number(teamId) : undefined, itemGroup, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, itemName, unit, isActive: isActive === undefined || isActive === "" ? undefined : isActive === "true" });
    }

    @Get(":id")
    @CanRead("accounts.item-master")
    get(@Param("id", ParseIntPipe) id: number) { return this.service.findById(id); }

}
