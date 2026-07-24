import { z } from 'zod';

export const SubmitCostingSheetSchema = z.object({
    enquiryId: z.number().int().positive(),
    finalPrice: z.string().optional().nullable(),
    receiptPreGst: z.string().optional().nullable(),
    budgetPreGst: z.string().optional().nullable(),
    grossMargin: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
});

export type SubmitCostingSheetDto = z.infer<typeof SubmitCostingSheetSchema>;

export const ResubmitCostingSheetSchema = z.object({
    enquiryId: z.number().int().positive(),
    finalPrice: z.string().optional().nullable(),
    receiptPreGst: z.string().optional().nullable(),
    budgetPreGst: z.string().optional().nullable(),
    grossMargin: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
});

export type ResubmitCostingSheetDto = z.infer<typeof ResubmitCostingSheetSchema>;

export const ApproveCostingSheetSchema = z.object({
    finalPrice: z.string().optional().nullable(),
    receiptPreGst: z.string().optional().nullable(),
    budgetPreGst: z.string().optional().nullable(),
    grossMargin: z.string().optional().nullable(),
    oemVendorId: z.number().int().positive().optional().nullable(),
    approvalRemarks: z.string().optional().nullable(),
});

export type ApproveCostingSheetDto = z.infer<typeof ApproveCostingSheetSchema>;

export const RedoCostingSheetSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
});

export type RedoCostingSheetDto = z.infer<typeof RedoCostingSheetSchema>;

export const RejectEnquirySchema = z.object({
    reason: z.string().optional().nullable(),
});

export type RejectEnquiryDto = z.infer<typeof RejectEnquirySchema>;

export const FindByEnquirySchema = z.object({
    enquiryId: z.number().int().positive(),
});

export type FindByEnquiryDto = z.infer<typeof FindByEnquirySchema>;
