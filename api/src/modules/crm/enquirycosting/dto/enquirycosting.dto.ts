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
