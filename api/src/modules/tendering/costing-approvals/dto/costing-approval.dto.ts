import { z } from 'zod';
import {
    decimalField,
    textField,
    optionalString,
} from '@/utils/zod-schema-generator';

const priceField = z.string().min(1).transform((val) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) {
        throw new z.ZodError([
            {
                code: z.ZodIssueCode.custom,
                path: ['finalPrice'],
                message: 'Price must be a valid non-negative number',
            },
        ]);
    }
    return val;
});

const marginField = z.string().min(1).transform((val) => {
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
});

/**
 * Single detail approval within a bulk approve
 */
export const DetailApprovalSchema = z.object({
    detailId: z.number().int().positive(),
    finalPrice: priceField,
    receiptPrice: priceField,
    budgetPrice: priceField,
    grossMargin: marginField,
    tlRemarks: textField().min(1, 'TL remarks are required'),
});

export type DetailApprovalDto = z.infer<typeof DetailApprovalSchema>;

/**
 * Approve Costing Schema - For approving a single detail or all
 */
export const ApproveCostingSchema = z.object({
    detailId: z.number().int().positive().optional(),
    finalPrice: priceField,
    receiptPrice: priceField,
    budgetPrice: priceField,
    grossMargin: marginField,
    oemVendorIds: z.array(z.coerce.number().int().positive()).min(0),
    tlRemarks: textField().min(1, 'TL remarks are required'),
});

export type ApproveCostingDto = z.infer<typeof ApproveCostingSchema>;

/**
 * Approve All Schema - For bulk approving all details
 */
export const ApproveAllCostingSchema = z.object({
    approvals: z.array(DetailApprovalSchema).min(1),
    oemVendorIds: z.array(z.coerce.number().int().positive()).min(0),
});

export type ApproveAllCostingDto = z.infer<typeof ApproveAllCostingSchema>;

/**
 * Reject Costing Schema - For rejecting a single detail or all
 */
export const RejectCostingSchema = z.object({
    detailId: z.number().int().positive().optional(),
    rejectionReason: textField().min(1, 'Rejection reason is required'),
});

export type RejectCostingDto = z.infer<typeof RejectCostingSchema>;

/**
 * Update Approved Costing Schema - Update a single approved detail
 */
export const UpdateApprovedCostingSchema = z.object({
    detailId: z.number().int().positive(),
    finalPrice: priceField.optional(),
    receiptPrice: priceField.optional(),
    budgetPrice: priceField.optional(),
    grossMargin: marginField.optional(),
    tlRemarks: textField().min(1, 'TL remarks are required').optional(),
});

export type UpdateApprovedCostingDto = z.infer<typeof UpdateApprovedCostingSchema>;
