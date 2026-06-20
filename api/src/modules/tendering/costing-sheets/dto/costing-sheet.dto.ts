import { z } from 'zod';
import {
    bigintField,
    decimalField,
    textField,
} from '@/utils/zod-schema-generator';

const costingDetailFields = {
    submittedFinalPrice: z.string().min(1, 'Final price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                { code: z.ZodIssueCode.custom, path: ['submittedFinalPrice'], message: 'Must be a valid non-negative number' },
            ]);
        }
        return val;
    }),
    submittedReceiptPrice: z.string().min(1, 'Receipt price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                { code: z.ZodIssueCode.custom, path: ['submittedReceiptPrice'], message: 'Must be a valid non-negative number' },
            ]);
        }
        return val;
    }),
    submittedBudgetPrice: z.string().min(1, 'Budget price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                { code: z.ZodIssueCode.custom, path: ['submittedBudgetPrice'], message: 'Must be a valid non-negative number' },
            ]);
        }
        return val;
    }),
    submittedGrossMargin: z.string().min(1, 'Gross margin is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 100) {
            throw new z.ZodError([
                { code: z.ZodIssueCode.custom, path: ['submittedGrossMargin'], message: 'Must be between 0 and 100' },
            ]);
        }
        return val;
    }),
    teRemarks: textField().min(1, 'TE remarks are required'),
};

const CostingDetailSchema = z.object(costingDetailFields);

/**
 * Submit Costing Sheet — accepts either a single set of pricing fields (old format)
 * or a `details[]` array (new multi-detail format).
 */
export const SubmitCostingSheetSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    details: z.array(CostingDetailSchema).min(1).optional(),
}).passthrough();

export type SubmitCostingSheetDto = z.infer<typeof SubmitCostingSheetSchema>;

/**
 * Update Costing Sheet — accepts partial detail updates or a details[] array.
 */
const costingDetailUpdateFields: Record<string, any> = {};
for (const [key, schema] of Object.entries(costingDetailFields)) {
    costingDetailUpdateFields[key] = schema.optional();
}

const CostingDetailUpdateSchema = z.object(costingDetailUpdateFields);

export const UpdateCostingSheetSchema = z.object({
    details: z.array(CostingDetailUpdateSchema).min(1).optional(),
}).passthrough();

export type UpdateCostingSheetDto = z.infer<typeof UpdateCostingSheetSchema>;

/**
 * Create Sheet Schema — For Google Sheet creation
 */
export const CreateSheetSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
});

export type CreateSheetDto = z.infer<typeof CreateSheetSchema>;

/**
 * Create Sheet With Name Schema — For named sheet creation
 */
export const CreateSheetWithNameSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    customName: z.string().min(1, 'Custom name is required'),
});

export type CreateSheetWithNameDto = z.infer<typeof CreateSheetWithNameSchema>;
