import { z } from 'zod';
import {
    bigintField,
    decimalField,
    textField,
} from '@/utils/zod-schema-generator';

/**
 * Submit Costing Sheet Schema - Based on tenderCostingSheets table
 */
export const SubmitCostingSheetSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    submittedFinalPrice: z.string().min(1, 'Submitted final price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['submittedFinalPrice'],
                    message: 'Submitted final price must be a valid non-negative number',
                },
            ]);
        }
        return val;
    }),
    submittedReceiptPrice: z.string().min(1, 'Submitted receipt price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['submittedReceiptPrice'],
                    message: 'Submitted receipt price must be a valid non-negative number',
                },
            ]);
        }
        return val;
    }),
    submittedBudgetPrice: z.string().min(1, 'Submitted budget price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['submittedBudgetPrice'],
                    message: 'Submitted budget price must be a valid non-negative number',
                },
            ]);
        }
        return val;
    }),
    submittedGrossMargin: z.string().min(1, 'Submitted gross margin is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 100) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['submittedGrossMargin'],
                    message: 'Submitted gross margin must be between 0 and 100',
                },
            ]);
        }
        return val;
    }),
    teRemarks: textField().min(1, 'TE remarks are required'),
});

export type SubmitCostingSheetDto = z.infer<typeof SubmitCostingSheetSchema>;

/**
 * Update Costing Sheet Schema - Partial update
 */
export const UpdateCostingSheetSchema = z.object({
    submittedFinalPrice: z.string().min(1, 'Submitted final price is required').optional(),
    submittedReceiptPrice: z.string().min(1, 'Submitted receipt price is required').optional(),
    submittedBudgetPrice: z.string().min(1, 'Submitted budget price is required').optional(),
    submittedGrossMargin: z.string().min(1, 'Submitted gross margin is required').optional(),
    teRemarks: textField().min(1, 'TE remarks are required').optional(),
});

export type UpdateCostingSheetDto = z.infer<typeof UpdateCostingSheetSchema>;

/**
 * Create Sheet Schema - For Google Sheet creation
 */
export const CreateSheetSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
});

export type CreateSheetDto = z.infer<typeof CreateSheetSchema>;

/**
 * Create Sheet With Name Schema - For named sheet creation
 */
export const CreateSheetWithNameSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    customName: z.string().min(1, 'Custom name is required'),
});

export type CreateSheetWithNameDto = z.infer<typeof CreateSheetWithNameSchema>;
