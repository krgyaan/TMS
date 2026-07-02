import { z } from 'zod';

const priceField = z.string().min(1, 'Price is required');

/**
 * Schema for a single detail approval line
 */
export const DetailApprovalFormSchema = z.object({
    detailId: z.number(),
    finalPrice: priceField,
    receiptPrice: priceField,
    budgetPrice: priceField,
    grossMargin: z.string(),
    tlRemarks: z.string().min(1, 'Remarks are required'),
});

export type DetailApprovalFormValues = z.infer<typeof DetailApprovalFormSchema>;

/**
 * Schema for approving a single detail (via approve endpoint)
 */
export const SingleApproveSchema = z.object({
    detailId: z.number().optional(),
    finalPrice: priceField,
    receiptPrice: priceField,
    budgetPrice: priceField,
    grossMargin: z.string(),
    oemVendorIds: z.array(z.string()).min(1, 'At least one vendor must be selected'),
    tlRemarks: z.string().min(1, 'Remarks are required'),
});

export type SingleApproveFormValues = z.infer<typeof SingleApproveSchema>;

/**
 * Schema for bulk approve (per-detail form values used in multi-detail form)
 */
export const MultiDetailFormSchema = z.object({
    oemVendorIds: z.array(z.string()).min(1, 'At least one vendor must be selected'),
    details: z.array(DetailApprovalFormSchema),
});

export type MultiDetailFormValues = z.infer<typeof MultiDetailFormSchema>;

export type CostingApprovalFormValues = MultiDetailFormValues;

/**
 * Schema for rejecting a costing sheet (single or bulk)
 */
export const CostingRejectionFormSchema = z.object({
    rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export type CostingRejectionFormValues = z.infer<typeof CostingRejectionFormSchema>;
