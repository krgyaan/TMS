import { z } from "zod";

const emptyToNull = (val: any) => (val === "" ? null : val);

export const createAssetSchema = z.object({
  assetType: z.string().min(1, "Asset Type is required"),
  assetCategory: z.string().min(1, "Asset Category is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  specifications: z.string().optional(),
  assetValue: z.string().optional(),
  assetCondition: z.string().min(1, "Asset Condition is required"),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.string().optional(),
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
  typeSpecs: z.record(z.any()).optional(),
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.assetStatus === "1") {
    if (!data.userId || data.userId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employee is required when assigning an asset",
        path: ["userId"],
      });
    }
    if (!data.assignedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assignment date is required when assigning an asset",
        path: ["assignedDate"],
      });
    }
  }
});

export type CreateAssetFormData = z.infer<typeof createAssetSchema>;

export const editAssetSchema = z.object({
  userId: z.union([z.string(), z.number()]).optional(),
  assetCode: z.string().min(1, "Asset Code is required"),
  assetType: z.string().min(1, "Asset Type is required"),
  assetCategory: z.string().min(1, "Asset Category is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  specifications: z.string().optional(),
  assetValue: z.string().optional(),
  assetCondition: z.string().min(1, "Asset Condition is required"),
  assignedDate: z.string().optional().or(z.literal("")),
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
  purchasePrice: z.string().optional(),
  purchaseFrom: z.string().optional(),
  typeSpecs: z.record(z.any()).optional(),
});

export type EditAssetFormData = z.infer<typeof editAssetSchema>;

export const statusUpdateSchema = z.object({
  assetStatus: z.string().min(1, "Status is required"),
  userId: z.coerce.number().optional(),
  assignedDate: z.string().optional().transform(emptyToNull),
  purpose: z.string().optional().transform(emptyToNull),
  assetLocation: z.string().optional().transform(emptyToNull),
  returnDate: z.string().optional().transform(emptyToNull),
  returnCondition: z.string().optional().transform(emptyToNull),
  assetCondition: z.string().optional().transform(emptyToNull),
  damageDate: z.string().optional().transform(emptyToNull),
  damageType: z.string().optional().transform(emptyToNull),
  damageDescription: z.string().optional().transform(emptyToNull),
  isRepairable: z.string().optional().transform(emptyToNull),
  lostDate: z.string().optional().transform(emptyToNull),
  lostLocation: z.string().optional().transform(emptyToNull),
  lostCircumstances: z.string().optional().transform(emptyToNull),
  policeReportNumber: z.string().optional().transform(emptyToNull),
  policeReportDate: z.string().optional().transform(emptyToNull),
  repairStartDate: z.string().optional().transform(emptyToNull),
  repairEndDate: z.string().optional().transform(emptyToNull),
  repairEstimatedCost: z.string().optional().transform(emptyToNull),
  repairVendor: z.string().optional().transform(emptyToNull),
  repairDescription: z.string().optional().transform(emptyToNull),
  deductionAmount: z.string().optional().transform(emptyToNull),
  deductionReason: z.string().optional().transform(emptyToNull),
  typeSpecs: z.record(z.any()).optional(),
  disposalDate: z.string().optional().transform(emptyToNull),
  disposalType: z.string().optional().transform(emptyToNull),
  disposalReason: z.string().optional().transform(emptyToNull),
  disposalAmount: z.string().optional().transform(emptyToNull),
  disposalApprovedBy: z.string().optional().transform(emptyToNull),
  remarks: z.string().optional().transform(emptyToNull),
});

export type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;
