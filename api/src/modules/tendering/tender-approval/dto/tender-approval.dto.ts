import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    bigintField,
    textField,
} from '@/utils/zod-schema-generator';

/**
 * Incomplete Field Schema
 */
const IncompleteFieldSchema = z.object({
    fieldName: textField().min(1, 'Field name is required'),
    comment: textField().min(1, 'Comment is required'),
});

export type IncompleteFieldDto = z.infer<typeof IncompleteFieldSchema>;

/**
 * Tender Approval Payload Schema - Based on tenders.schema.ts (approval fields)
 */
export const TenderApprovalPayloadSchema = z.object({
    tlStatus: z.enum(['0', '1', '2', '3'], {
        required_error: 'TL status is required',
        invalid_type_error: 'TL status must be one of: 0, 1, 2, 3',
    }),
    rfqTo: z.array(bigintField().positive()).optional(),
    processingFeeMode: optionalTextField(100),
    tenderFeeMode: optionalTextField(100),
    emdMode: optionalTextField(100),
    approvePqrSelection: z.enum(['1', '2']).optional(),
    approveFinanceDocSelection: z.enum(['1', '2']).optional(),
    alternativeTechnicalDocs: z.array(z.string()).optional(),
    alternativeFinancialDocs: z.array(z.string()).optional(),
    tenderStatus: bigintField().positive().optional(),
    oemNotAllowed: optionalTextField(50),
    tlRejectionRemarks: optionalTextField(1000),
    incompleteFields: z.array(IncompleteFieldSchema).optional(),
});

export type TenderApprovalPayload = z.infer<typeof TenderApprovalPayloadSchema>;
