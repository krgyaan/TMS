import { z } from "zod";
import { findCatalogItem, fieldIsVisible, UNIT_OPTIONS } from "./item-catalog";

export const buildInventoryItemFormSchema = () => z.object({
    category: z.string().min(1, "Category is required"),
    itemName: z.string().min(1, "Item name is required"),
    itemType: z.string().max(80).optional(),
    specifications: z.record(z.string(), z.string().max(200)),
    makeBrand: z.string().max(120).optional(),
    description: z.string().max(500).optional(),
    unit: z.enum(UNIT_OPTIONS, { message: "Unit is required" }),
    conversionEnabled: z.boolean().default(false),
    conversionUnit: z.string(),
    conversionFactor: z.string(),
    hsnCode: z.string().regex(/^\d{4,8}$/, "HSN code must contain 4 to 8 digits"),
    isActive: z.boolean(),
}).superRefine((values, context) => {
    const item = findCatalogItem(values.category, values.itemName);
    if (!item) {
        context.addIssue({ code: "custom", path: ["itemName"], message: "Choose an item from this category." });
    } else {
        const knownFields = new Set(item.fields.map(field => field.key));
        if (values.category !== "Legacy") {
            for (const key of Object.keys(values.specifications)) {
                if (!knownFields.has(key)) context.addIssue({ code: "custom", path: ["specifications", key], message: `Unknown specification key: ${key}` });
            }
        }
        for (const field of item.fields) {
            const value = values.specifications[field.key]?.trim() || "";
            const visible = fieldIsVisible(values.specifications, field);
            if (!visible) {
                if (value) context.addIssue({ code: "custom", path: ["specifications", field.key], message: `${field.label} is not available for this selection.` });
                continue;
            }
            if (!value) {
                if (field.required) context.addIssue({ code: "custom", path: ["specifications", field.key], message: `${field.label} is required.` });
                continue;
            }
            if (field.options && !field.options.some(option => option.value === value)) {
                context.addIssue({ code: "custom", path: ["specifications", field.key], message: `Choose a valid ${field.label.toLowerCase()}.` });
            }
            if (field.kind === "number") {
                const number = Number(value);
                if (!Number.isFinite(number) || (field.minExclusive ? number <= (field.min ?? 0) : field.min !== undefined && number < field.min)) {
                    context.addIssue({ code: "custom", path: ["specifications", field.key], message: `${field.label} must be greater than ${field.min ?? 0}.` });
                } else if (field.max !== undefined && number > field.max) {
                    context.addIssue({ code: "custom", path: ["specifications", field.key], message: `${field.label} must be at most ${field.max}.` });
                } else if (field.integer && !Number.isInteger(number)) {
                    context.addIssue({ code: "custom", path: ["specifications", field.key], message: `${field.label} must be a whole number.` });
                }
            }
        }
    }

    if (!values.conversionEnabled) return;
    if (!values.conversionUnit) {
        context.addIssue({ code: "custom", path: ["conversionUnit"], message: "Choose a conversion unit." });
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
