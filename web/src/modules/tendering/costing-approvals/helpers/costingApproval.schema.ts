import { z } from 'zod';

/**
 * Schema for approving a costing sheet
 */
export const CostingApprovalFormSchema = z.object({
    finalPrice: z.string().min(1, 'Final price is required'),
    receiptPrice: z.string().min(1, 'Receipt price is required'),
    budgetPrice: z.string().min(1, 'Budget price is required'),
    grossMargin: z.string(),
    oemVendorIds: z.array(z.string()).min(1, 'At least one vendor must be selected'),
    tlRemarks: z.string().min(1, 'Remarks are required'),
});

export type CostingApprovalFormValues = z.infer<typeof CostingApprovalFormSchema>;

/**
 * Schema for rejecting a costing sheet
 */
export const CostingRejectionFormSchema = z.object({
    rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export type CostingRejectionFormValues = z.infer<typeof CostingRejectionFormSchema>;
