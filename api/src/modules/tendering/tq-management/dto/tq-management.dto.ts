import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    requiredDateField,
    dateField,
    bigintField,
    textField,
    booleanField,
} from '@/utils/zod-schema-generator';

/**
 * TQ Item Schema - Based on tenderQueryItems table
 */
const TqItemSchema = z.object({
    tqTypeId: bigintField().positive('TQ Type ID must be positive'),
    queryDescription: textField().min(1, 'Query description is required'),
});

export type TqItemDto = z.infer<typeof TqItemSchema>;

/**
 * Create TQ Received Schema - Based on tenderQueries table
 */
export const CreateTqReceivedSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    tqSubmissionDeadline: requiredDateField,
    tqDocumentReceived: optionalTextField(500),
    tqItems: z.array(TqItemSchema).min(1, 'At least one TQ item is required'),
});

export type CreateTqReceivedDto = z.infer<typeof CreateTqReceivedSchema>;

/**
 * Update TQ Replied Schema - Update for TQ replied
 */
export const UpdateTqRepliedSchema = z.object({
    repliedDatetime: requiredDateField,
    repliedDocument: optionalTextField(500),
    proofOfSubmission: textField(500).min(1, 'Proof of submission is required'),
});

export type UpdateTqRepliedDto = z.infer<typeof UpdateTqRepliedSchema>;

/**
 * Update TQ Missed Schema - Update for TQ missed
 */
export const UpdateTqMissedSchema = z.object({
    missedReason: textField().min(1, 'Missed reason is required'),
    preventionMeasures: textField().min(1, 'Prevention measures are required'),
    tmsImprovements: textField().min(1, 'TMS improvements are required'),
});

export type UpdateTqMissedDto = z.infer<typeof UpdateTqMissedSchema>;

/**
 * Mark As No TQ Schema - For no TQ scenario
 */
export const MarkAsNoTqSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    qualified: booleanField(true),
});

export type MarkAsNoTqDto = z.infer<typeof MarkAsNoTqSchema>;

/**
 * Update TQ Received Schema - Update received TQ
 */
export const UpdateTqReceivedSchema = z.object({
    tqSubmissionDeadline: requiredDateField,
    tqDocumentReceived: optionalTextField(500),
    tqItems: z.array(TqItemSchema).min(1, 'At least one TQ item is required'),
});

export type UpdateTqReceivedDto = z.infer<typeof UpdateTqReceivedSchema>;

/**
 * TQ Qualified Schema - For qualification status
 */
export const TqQualifiedSchema = z.object({
    qualified: booleanField(true),
});

export type TqQualifiedDto = z.infer<typeof TqQualifiedSchema>;
