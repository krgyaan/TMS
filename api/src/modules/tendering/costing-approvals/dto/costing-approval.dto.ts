import { z } from 'zod';
import {
    decimalField,
    textField,
    optionalString,
} from '@/utils/zod-schema-generator';

/**
 * Approve Costing Schema - For approval action
 */
export const ApproveCostingSchema = z.object({
    finalPrice: z.string().min(1, 'Final price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['finalPrice'],
                    message: 'Final price must be a valid non-negative number',
                },
            ]);
        }
        return val;
    }),
    receiptPrice: z.string().min(1, 'Receipt price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['receiptPrice'],
                    message: 'Receipt price must be a valid non-negative number',
                },
            ]);
        }
        return val;
    }),
    budgetPrice: z.string().min(1, 'Budget price is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['budgetPrice'],
                    message: 'Budget price must be a valid non-negative number',
                },
            ]);
        }
        return val;
    }),
    grossMargin: z.string().min(1, 'Gross margin is required').transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 100) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['grossMargin'],
                    message: 'Gross margin must be between 0 and 100',
                },
            ]);
        }
        return val;
    }),
    oemVendorIds: z.array(z.coerce.number().int().positive()).min(0),
    tlRemarks: textField().min(1, 'TL remarks are required'),
});

export type ApproveCostingDto = z.infer<typeof ApproveCostingSchema>;

/**
 * Reject Costing Schema - For rejection action
 */
export const RejectCostingSchema = z.object({
    rejectionReason: textField().min(1, 'Rejection reason is required'),
});

export type RejectCostingDto = z.infer<typeof RejectCostingSchema>;

/**
 * Update Approved Costing Schema - Update approved costing
 */
export const UpdateApprovedCostingSchema = z.object({
    finalPrice: z.string().min(1, 'Final price is required').optional(),
    receiptPrice: z.string().min(1, 'Receipt price is required').optional(),
    budgetPrice: z.string().min(1, 'Budget price is required').optional(),
    grossMargin: z.string().min(1, 'Gross margin is required').optional(),
    oemVendorIds: z.array(z.coerce.number().int().positive()).optional(),
    tlRemarks: textField().min(1, 'TL remarks are required').optional(),
});

export type UpdateApprovedCostingDto = z.infer<typeof UpdateApprovedCostingSchema>;
