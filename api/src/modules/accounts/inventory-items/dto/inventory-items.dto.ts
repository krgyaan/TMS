import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { UNIT_OPTIONS } from "../item-catalog";

const ITEM_GROUPS = ["Raw Materials", "Finished Goods", "Supplies"] as const;
const HSN_CODE = z.string().trim().max(8).refine(value => value === "" || /^\d{4,8}$/.test(value), "HSN code must contain 4 to 8 digits");

export const itemSchema = z.object({
    teamId: z.number().int().positive().nullable().optional(),
    itemGroup: z.enum(ITEM_GROUPS).nullable().optional(),
    category: z.string().trim().min(1).max(80),
    modelNumber: z.string().trim().max(120).nullable().optional(),
    itemName: z.string().trim().min(1).max(120),
    itemType: z.string().trim().max(80).nullable().optional(),
    makeBrand: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    specifications: z.record(z.string(), z.string().trim().max(200)).default({}),
    unit: z.enum(UNIT_OPTIONS),
    conversionUnit: z.enum(UNIT_OPTIONS).nullable().optional(),
    conversionFactor: z.union([z.number(), z.string()]).nullable().optional(),
    hsnCode: HSN_CODE.nullable().optional(),
    isActive: z.boolean().default(true),
});

export const updateItemSchema = itemSchema.partial().extend({ hsnCode: HSN_CODE.nullable().optional() });

export const parseItemBody = <T extends z.ZodType>(schema: T, body: unknown): z.infer<T> => {
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new BadRequestException(result.error.issues.map(issue => `${issue.path.join(".") || "item"}: ${issue.message}`).join("; "));
    }
    return result.data;
};
