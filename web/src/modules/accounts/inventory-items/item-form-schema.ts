import { z } from "zod";
import { UNIT_OPTIONS } from "./item-config.ts";

export const buildInventoryItemFormSchema = () => z.object({
    teamId: z.string().min(1, "Team is required"),
    itemName: z.string().min(1, "Item name is required"),
    itemType: z.string().optional(),
    specifications: z.record(z.string(), z.string()),
    description: z.string().optional(),
    unit: z.enum(UNIT_OPTIONS, { message: "Unit is required" }),
    conversionUnit: z.string(),
    conversionFactor: z.string(),
    hsnCode: z.string().optional(),
    isActive: z.boolean(),
}).superRefine((values, context) => {
    if (!values.conversionUnit) {
        if (values.conversionFactor.trim()) context.addIssue({ code: "custom", path: ["conversionFactor"], message: "Choose a conversion unit first." });
        return;
    }
    if (values.conversionUnit === values.unit) context.addIssue({ code: "custom", path: ["conversionUnit"], message: "Unit and conversion unit must differ." });
    if (!values.conversionFactor.trim()) context.addIssue({ code: "custom", path: ["conversionFactor"], message: "Conversion factor is required." });
    else if (!Number.isFinite(Number(values.conversionFactor)) || Number(values.conversionFactor) <= 0) {
        context.addIssue({ code: "custom", path: ["conversionFactor"], message: "Enter a positive conversion factor." });
    }
});

export const inventoryItemFormSchema = buildInventoryItemFormSchema();
export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;
