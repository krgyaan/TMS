import { z } from 'zod';

/**
 * Schema for submitting/updating a costing sheet
 */
export const CostingSheetFormSchema = z.object({
    tenderId: z.number().min(1, 'Tender ID is required'),
    submittedFinalPrice: z.string().min(1, 'Final price is required'),
    submittedReceiptPrice: z.string().min(1, 'Receipt price is required'),
    submittedBudgetPrice: z.string().min(1, 'Budget price is required'),
    submittedGrossMargin: z.string(),
    teRemarks: z.string().min(1, 'Remarks are required'),
});

export type CostingSheetFormValues = z.infer<typeof CostingSheetFormSchema>;
