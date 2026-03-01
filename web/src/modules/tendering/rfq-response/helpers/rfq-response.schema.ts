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
    receiptDatetime: z.date({ message: 'Quotation receipt date and time is required' }),
    items: z.array(RfqResponseFormItemSchema).min(1, 'At least one item is required'),
    gstPercentage: z.coerce.number().min(0).max(100),
    gstType: z.string().min(1, 'GST type is required'),
    deliveryTime: z.coerce.number().int().min(0, 'Delivery time is required'),
    freightType: z.string().min(1, 'Freight type is required'),
    quotationPaths: z.array(z.string()).default([]),
    technicalPaths: z.array(z.string()).default([]),
    mafPaths: z.array(z.string()).default([]),
    miiPaths: z.array(z.string()).default([]),
});

export type RfqResponseFormValues = z.infer<typeof RfqResponseFormSchema>;
