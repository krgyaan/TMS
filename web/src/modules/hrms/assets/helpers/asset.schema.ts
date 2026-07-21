import { z } from "zod";

export const createAssetSchema = z.object({
  assetType: z.string().min(1, "Asset Type is required"),
  assetCategory: z.string().min(1, "Asset Category is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  assetValue: z.number().optional().nullable(),
  assetCondition: z.string().min(1, "Asset Condition is required"),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.number().optional().nullable(),
  purchaseFrom: z.string().optional(),
  userId: z.number().optional(),
  assignedDate: z.string().optional().or(z.literal("")),
  expectedReturnDate: z.string().optional().or(z.literal("")),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),
  serialNumber: z.string().optional(),
  imeiNumber: z.string().optional(),
  licenseKey: z.string().optional(),
  warrantyFrom: z.string().optional().or(z.literal("")),
  warrantyTo: z.string().optional().or(z.literal("")),
  insuranceDetails: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  accessoryDetails: z.string().optional(),
  assetStatus: z.string().min(1, "Current Status is required"),
  typeSpecs: z.record(z.string(), z.any()).optional(),
  remarks: z.string().optional(),
});

export type CreateAssetFormData = z.infer<typeof createAssetSchema>;

export const editAssetSchema = z.object({
  userId: z.union([z.string(), z.number()]).optional(),
  assetCode: z.string().min(1, "Asset Code is required"),
  assetType: z.string().min(1, "Asset Type is required"),
  assetCategory: z.string().min(1, "Asset Category is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  assetValue: z.number().optional().nullable(),
  assetCondition: z.string().min(1, "Asset Condition is required"),
  assignedDate: z.string().optional().or(z.literal("")),
  expectedReturnDate: z.string().optional().or(z.literal("")),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),
  serialNumber: z.string().optional(),
  imeiNumber: z.string().optional(),
  licenseKey: z.string().optional(),
  warrantyFrom: z.string().optional().or(z.literal("")),
  warrantyTo: z.string().optional().or(z.literal("")),
  insuranceDetails: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  accessoryDetails: z.string().optional(),
  assetStatus: z.string().optional(),
  returnDate: z.string().optional().or(z.literal("")),
  returnCondition: z.string().optional(),
  damageRemarks: z.string().optional(),
  deductionAmount: z.string().optional(),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.number().optional().nullable(),
  purchaseFrom: z.string().optional(),
  typeSpecs: z.record(z.string(), z.any()).optional(),
});

export type EditAssetFormData = z.infer<typeof editAssetSchema>;

export const statusUpdateSchema = z.object({
  assetStatus: z.string().min(1, "Status is required"),
  userId: z.number().optional().nullable(),
  assignedDate: z.string().optional(),
  purpose: z.string().optional(),
  assetLocation: z.string().optional(),
  returnDate: z.string().optional(),
  returnCondition: z.string().optional(),
  assetCondition: z.string().optional(),
  damageDate: z.string().optional(),
  damageType: z.string().optional(),
  damageDescription: z.string().optional(),
  isRepairable: z.string().optional(),
  lostDate: z.string().optional(),
  lostLocation: z.string().optional(),
  lostCircumstances: z.string().optional(),
  policeReportNumber: z.string().optional(),
  policeReportDate: z.string().optional(),
  repairStartDate: z.string().optional(),
  repairEndDate: z.string().optional(),
  repairEstimatedCost: z.string().optional(),
  repairVendor: z.string().optional(),
  repairDescription: z.string().optional(),
  deductionAmount: z.string().optional(),
  deductionReason: z.string().optional(),
  typeSpecs: z.record(z.string(), z.any()).optional(),
  disposalDate: z.string().optional(),
  disposalType: z.string().optional(),
  disposalReason: z.string().optional(),
  disposalAmount: z.string().optional(),
  disposalApprovedBy: z.string().optional(),
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
  const s = data.assetStatus;
  if (s === "assigned") {
    if (data.userId == null) ctx.addIssue({ code: "custom", message: "Assignee is required", path: ["userId"] });
    if (!data.assignedDate) ctx.addIssue({ code: "custom", message: "Assignment date is required", path: ["assignedDate"] });
  }
  if (s === "returned") {
    if (!data.returnDate) ctx.addIssue({ code: "custom", message: "Return date is required", path: ["returnDate"] });
    if (!data.returnCondition) ctx.addIssue({ code: "custom", message: "Return condition is required", path: ["returnCondition"] });
  }
  if (s === "damaged") {
    if (!data.damageDate) ctx.addIssue({ code: "custom", message: "Damage date is required", path: ["damageDate"] });
    if (!data.damageType) ctx.addIssue({ code: "custom", message: "Damage type is required", path: ["damageType"] });
  }
  if (s === "lost") {
    if (!data.lostDate) ctx.addIssue({ code: "custom", message: "Date lost is required", path: ["lostDate"] });
  }
  if (s === "under_repair") {
    if (!data.repairStartDate) ctx.addIssue({ code: "custom", message: "Repair start date is required", path: ["repairStartDate"] });
  }
  if (s === "disposed") {
    if (!data.disposalDate) ctx.addIssue({ code: "custom", message: "Disposal date is required", path: ["disposalDate"] });
    if (!data.disposalType) ctx.addIssue({ code: "custom", message: "Disposal type is required", path: ["disposalType"] });
  }
});

export type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;
