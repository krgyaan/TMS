import { z } from 'zod';
import {
    optionalString,
    optionalNumber,
    optionalTextField,
    dateField,
    requiredDateField,
    decimalField,
    textField,
    jsonbField,
    bigintField,
} from '@/utils/zod-schema-generator';

/**
 * RFQ Item Schema - Based on rfqItems table
 */
export const RfqItemSchema = z.object({
    requirement: textField().min(1, 'Requirement is required'),
    unit: optionalTextField(64),
    qty: optionalNumber(z.coerce.number().nonnegative()),
});

export type RfqItemDto = z.infer<typeof RfqItemSchema>;

/**
 * RFQ Document Schema - Based on rfqDocuments table
 */
export const RfqDocumentSchema = z.object({
    docType: textField(50).min(1, 'Document type is required'),
    path: textField().min(1, 'Path is required'),
    metadata: jsonbField(z.record(z.any())).optional(),
});

export type RfqDocumentDto = z.infer<typeof RfqDocumentSchema>;

/**
 * Create RFQ Schema - Based on rfqs table + nested rfqItems + rfqDocuments
 */
export const CreateRfqSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    dueDate: dateField,
    docList: optionalString,
    requestedVendor: optionalTextField(255),
    items: z.array(RfqItemSchema).min(1, 'At least one item is required'),
    documents: z.array(RfqDocumentSchema).optional(),
});

export type CreateRfqDto = z.infer<typeof CreateRfqSchema>;

/**
 * Update RFQ Schema - Partial of CreateRfqSchema
 */
export const UpdateRfqSchema = z.object({
    dueDate: dateField,
    docList: optionalString,
    requestedVendor: optionalTextField(255),
    items: z.array(RfqItemSchema).optional(),
    documents: z.array(RfqDocumentSchema).optional(),
});

export type UpdateRfqDto = z.infer<typeof UpdateRfqSchema>;
