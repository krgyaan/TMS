import { z } from 'zod';
import {
    optionalString,
    optionalNumber,
    optionalTextField,
    dateField,
    requiredDateField,
    decimalField,
    bigintField,
} from '@/utils/zod-schema-generator';
import { RfqDocumentSchema } from '@/modules/tendering/rfqs/dto/rfq.dto';

/**
 * RFQ Response Item Schema - Based on rfqResponseItems table
 */
export const RfqResponseItemSchema = z.object({
    itemId: bigintField().positive('RFQ item ID is required'),
    requirement: z.string().min(1, 'Requirement is required'),
    unit: optionalTextField(64),
    qty: optionalNumber(z.coerce.number().nonnegative()),
    unitPrice: optionalNumber(z.coerce.number().min(0)),
    totalPrice: optionalNumber(z.coerce.number().min(0)),
});

export type RfqResponseItemDto = z.infer<typeof RfqResponseItemSchema>;

/**
 * Create RFQ Response Schema - Based on rfqResponses table
 */
export const CreateRfqResponseSchema = z.object({
    rfqId: bigintField().positive('RFQ ID must be positive'),
    vendorId: bigintField().positive('Vendor ID must be positive'),
    receiptDatetime: requiredDateField,
    gstPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    gstType: optionalTextField(50),
    deliveryTime: optionalNumber(z.coerce.number().int().nonnegative()),
    freightType: optionalTextField(50),
    notes: optionalString,
    items: z.array(RfqResponseItemSchema).min(1, 'At least one item is required'),
    documents: z.array(RfqDocumentSchema).optional(),
});

export type CreateRfqResponseDto = z.infer<typeof CreateRfqResponseSchema>;

/**
 * Body for POST /rfqs/:rfqId/responses (rfqId comes from URL)
 */
export const CreateRfqResponseBodySchema = CreateRfqResponseSchema.omit({ rfqId: true });
export type CreateRfqResponseBodyDto = z.infer<typeof CreateRfqResponseBodySchema>;

/**
 * Update RFQ Response Schema - Partial update
 */
export const UpdateRfqResponseSchema = z.object({
    receiptDatetime: dateField,
    gstPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    gstType: optionalTextField(50),
    deliveryTime: optionalNumber(z.coerce.number().int().nonnegative()),
    freightType: optionalTextField(50),
    notes: optionalString,
});

export type UpdateRfqResponseDto = z.infer<typeof UpdateRfqResponseSchema>;
