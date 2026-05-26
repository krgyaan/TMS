import { z } from 'zod';

/**
 * Schema for RFQ Response Capture form
 */
export const RfqResponseFormItemSchema = z.object({
    itemId: z.coerce.number().positive('Item is required'),
    masterItemId: z.union([z.coerce.number(), z.string(), z.literal('')]).optional(),
    requirement: z.string().min(1, 'Requirement is required'),
    unit: z.string().min(1, 'Unit is required'),
    qty: z.number().min(0.01, 'Quantity must be greater than 0'),
    unitPrice: z.number().min(0, 'Unit price must be 0 or more'),
});

export const RfqResponseFormSchema = z.object({
    orgId: z.string().min(1, 'Organization is required'),
    vendorId: z.string().min(1, 'Vendor is required'),
    responseStatus: z.string().min(1, 'Response status is required'),
    receiptDatetime: z.date({ message: 'Quotation receipt date and time is required' }).nullable().optional(),
    items: z.array(RfqResponseFormItemSchema).min(1, 'At least one item is required'),
    gstPercentage: z.coerce.number().min(0).max(100).optional(),
    gstType: z.string().optional(),
    deliveryTime: z.coerce.number().int().min(0, 'Delivery time must be 0 or more').optional(),
    freightType: z.string().optional(),
    quotationPaths: z.array(z.string()).default([]),
    technicalPaths: z.array(z.string()).default([]),
    mafPaths: z.array(z.string()).default([]),
    miiPaths: z.array(z.string()).default([]),
    generalRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.responseStatus === '1') {
        if (!data.receiptDatetime) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Quotation receipt date and time is required',
                path: ['receiptDatetime'],
            });
        }
        if (!data.gstType || data.gstType.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'GST type is required',
                path: ['gstType'],
            });
        }
        if (data.deliveryTime === undefined || data.deliveryTime === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Delivery time is required',
                path: ['deliveryTime'],
            });
        }
        if (!data.freightType || data.freightType.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Freight type is required',
                path: ['freightType'],
            });
        }
    }
});

export type RfqResponseFormValues = z.infer<typeof RfqResponseFormSchema>;
