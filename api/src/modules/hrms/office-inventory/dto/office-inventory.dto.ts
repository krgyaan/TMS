import { z } from "zod";

export const ITEM_CATEGORIES = ["Housekeeping", "Pantry", "Stationery"] as const;
export const EQUIPMENT_CATEGORIES = ["Housekeeping", "Pantry"] as const;
export const EQUIPMENT_CONDITIONS = ["Good", "Needs Repair", "Needs Replacement"] as const;
export const EQUIPMENT_MOVEMENT_TYPES = [
    "New Purchase",
    "Discard - End of Life",
    "Discard - Damaged/Lost",
] as const;
export const APPLIANCE_SERVICE_FREQUENCIES = [
    "Monthly",
    "Quarterly",
    "Half-Yearly",
    "Yearly",
    "As Needed",
] as const;
export const APPLIANCE_CLEANING_FREQUENCIES = [
    "Daily",
    "Weekly",
    "Fortnightly",
    "Monthly",
    "Quarterly",
    "As Needed",
] as const;
export const APPLIANCE_STATUSES = ["In Service", "Under Repair", "Discarded"] as const;
export const APPLIANCE_VISIT_TYPES = [
    "Routine Service",
    "AMC",
    "Repair",
    "Filter Change",
] as const;
export const APPLIANCE_CLEANING_TYPES = [
    "Routine Cleaning",
    "Deep Cleaning",
    "Descaling",
    "Sanitization",
] as const;

const optionalString = z
    .string()
    .optional()
    .nullable()
    .transform(v => (v === undefined ? undefined : v?.trim() || null));

const optionalDateString = z
    .string()
    .optional()
    .nullable()
    .transform(v => {
        if (v === undefined) return undefined;
        const trimmed = v?.trim();
        return trimmed ? trimmed.slice(0, 10) : null;
    });

const requiredDateString = z
    .string()
    .min(10, "Date is required")
    .transform(v => v.trim().slice(0, 10));

const nonNegativeNumber = z.coerce.number().min(0, "Must be 0 or greater");
const positiveNumber = z.coerce.number().gt(0, "Must be greater than 0");

// 1. Item Master
export const CreateItemSchema = z.object({
    category: z.enum(ITEM_CATEGORIES),
    itemCode: z
        .string()
        .trim()
        .min(1)
        .max(50)
        .optional(),
    itemName: z.string().trim().min(1, "Item name is required").max(255),
    unit: z.string().trim().min(1, "Unit is required").max(50),
    minStockLevel: nonNegativeNumber.default(0),
    openingStock: nonNegativeNumber.default(0),
});
export const UpdateItemSchema = CreateItemSchema.partial();

// 2. Purchase Log
export const CreatePurchaseSchema = z.object({
    purchaseDate: requiredDateString,
    itemId: z.coerce.number().int().positive(),
    qtyPurchased: positiveNumber,
    rate: nonNegativeNumber.default(0),
    supplier: optionalString,
    notes: optionalString,
});
export const UpdatePurchaseSchema = CreatePurchaseSchema.partial();

// 3. Consumption Log
export const CreateConsumptionSchema = z.object({
    consumptionDate: requiredDateString,
    itemId: z.coerce.number().int().positive(),
    qtyIssued: positiveNumber,
    issuedTo: optionalString,
    notes: optionalString,
});
export const UpdateConsumptionSchema = CreateConsumptionSchema.partial();

// 4. Equipment Register
export const CreateEquipmentSchema = z.object({
    category: z.enum(EQUIPMENT_CATEGORIES),
    equipmentCode: z
        .string()
        .trim()
        .min(1)
        .max(50)
        .optional(),
    itemName: z.string().trim().min(1, "Equipment name is required").max(255),
    unit: z.string().trim().min(1, "Unit is required").max(50),
    location: optionalString,
    openingQty: nonNegativeNumber.default(0),
    unitCost: nonNegativeNumber.default(0),
    condition: z.enum(EQUIPMENT_CONDITIONS).default("Good"),
    remarks: optionalString,
});
export const UpdateEquipmentSchema = CreateEquipmentSchema.partial();

// 5. Equipment Movement Log
export const CreateEquipmentLogSchema = z.object({
    logDate: requiredDateString,
    equipmentId: z.coerce.number().int().positive(),
    movementType: z.enum(EQUIPMENT_MOVEMENT_TYPES),
    qty: positiveNumber,
    cost: z
        .union([z.coerce.number().min(0), z.null(), z.literal("")])
        .optional()
        .transform(v => (v === "" || v === undefined ? null : v)),
    reasonNotes: optionalString,
    approvedBy: optionalString,
});
export const UpdateEquipmentLogSchema = CreateEquipmentLogSchema.partial();

// 6. Pantry Appliances
export const CreateApplianceSchema = z.object({
    applianceCode: z
        .string()
        .trim()
        .min(1)
        .max(50)
        .optional(),
    applianceName: z.string().trim().min(1, "Appliance name is required").max(255),
    brandModel: optionalString,
    location: optionalString,
    purchaseDate: optionalDateString,
    purchaseCost: z
        .union([z.coerce.number().min(0), z.null(), z.literal("")])
        .optional()
        .transform(v => (v === "" || v === undefined ? null : v)),
    warrantyExpiry: optionalDateString,
    serviceFrequency: z.enum(APPLIANCE_SERVICE_FREQUENCIES).default("As Needed"),
    cleaningFrequency: z.enum(APPLIANCE_CLEANING_FREQUENCIES).default("Weekly"),
    status: z.enum(APPLIANCE_STATUSES).default("In Service"),
    discardDate: optionalDateString,
    notes: optionalString,
});
export const UpdateApplianceSchema = CreateApplianceSchema.partial();

// 7. Appliance Service Visit Log
export const CreateApplianceServiceSchema = z.object({
    serviceDate: requiredDateString,
    applianceId: z.coerce.number().int().positive(),
    visitType: z.enum(APPLIANCE_VISIT_TYPES),
    vendorTechnician: optionalString,
    expense: nonNegativeNumber.default(0),
    nextServiceDue: optionalDateString,
    notes: optionalString,
});
export const UpdateApplianceServiceSchema = CreateApplianceServiceSchema.partial();

// 8. Appliance Cleaning Log
export const CreateApplianceCleaningSchema = z.object({
    cleaningDate: requiredDateString,
    applianceId: z.coerce.number().int().positive(),
    cleaningType: z.enum(APPLIANCE_CLEANING_TYPES),
    doneBy: optionalString,
    cost: z
        .union([z.coerce.number().min(0), z.null(), z.literal("")])
        .optional()
        .transform(v => (v === "" || v === undefined ? 0 : v ?? 0)),
    notes: optionalString,
});
export const UpdateApplianceCleaningSchema = CreateApplianceCleaningSchema.partial();

export type CreateItemDto = z.infer<typeof CreateItemSchema>;
export type UpdateItemDto = z.infer<typeof UpdateItemSchema>;
export type CreatePurchaseDto = z.infer<typeof CreatePurchaseSchema>;
export type UpdatePurchaseDto = z.infer<typeof UpdatePurchaseSchema>;
export type CreateConsumptionDto = z.infer<typeof CreateConsumptionSchema>;
export type UpdateConsumptionDto = z.infer<typeof UpdateConsumptionSchema>;
export type CreateEquipmentDto = z.infer<typeof CreateEquipmentSchema>;
export type UpdateEquipmentDto = z.infer<typeof UpdateEquipmentSchema>;
export type CreateEquipmentLogDto = z.infer<typeof CreateEquipmentLogSchema>;
export type UpdateEquipmentLogDto = z.infer<typeof UpdateEquipmentLogSchema>;
export type CreateApplianceDto = z.infer<typeof CreateApplianceSchema>;
export type UpdateApplianceDto = z.infer<typeof UpdateApplianceSchema>;
export type CreateApplianceServiceDto = z.infer<typeof CreateApplianceServiceSchema>;
export type UpdateApplianceServiceDto = z.infer<typeof UpdateApplianceServiceSchema>;
export type CreateApplianceCleaningDto = z.infer<typeof CreateApplianceCleaningSchema>;
export type UpdateApplianceCleaningDto = z.infer<typeof UpdateApplianceCleaningSchema>;
