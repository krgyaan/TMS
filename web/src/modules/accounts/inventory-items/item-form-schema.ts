import { z } from "zod";
import { UNIT_OPTIONS } from "./item-config.ts";

export const buildInventoryItemFormSchema = () => z.object({
    teamId: z.string().min(1, "Team is required"),
    itemName: z.string().min(1, "Item name is required"),
    itemType: z.string().optional(),
    specifications: z.record(z.string(), z.string()),
    description: z.string().optional(),
    unit: z.enum(UNIT_OPTIONS, { message: "Unit is required" }),
    hsnCode: z.string().optional(),
    isActive: z.boolean(),
});

export const inventoryItemFormSchema = buildInventoryItemFormSchema();
export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;
