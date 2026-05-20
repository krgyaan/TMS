import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    optionalNumber,
    decimalField,
    requiredEnumField,
} from '@/utils/zod-schema-generator';

export const UploadResultSchema = z.object({
    technicallyQualified: requiredEnumField(['Yes', 'No']),
    disqualificationReason: optionalString,
    qualifiedPartiesCount: optionalTextField(50),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    result: z.enum(['Won', 'Lost']).optional(),
    resultReason: optionalString,
    l1Price: optionalNumber(z.coerce.number().min(0, 'L1 price must be non-negative')),
    l2Price: optionalNumber(z.coerce.number().min(0, 'L2 price must be non-negative')),
    ourPrice: optionalNumber(z.coerce.number().min(0, 'Our price must be non-negative')),
    qualifiedPartiesScreenshot: optionalString,
    finalResultScreenshot: optionalString,
});

export const UploadTenderCancelledSchema = z.object({
    proofScreenshot : z.string({ required_error: "No screenshot uploaded" }),
    result: z.string({ required_error: "Reason for Cancellation is required" }),
});

export type UploadResultDto = z.infer<typeof UploadResultSchema>;
export type UploadTenderCancelledDto = z.infer<typeof UploadTenderCancelledSchema>;