import { optionalNumber, optionalString, optionalTextField, requiredEnumField } from '@/utils/zod-schema-generator';
import { z } from 'zod';

const ResultDetailSchema = z.object({
    result: z.enum(['Won', 'Lost', 'Cancelled']).optional(),
    resultReason: optionalString,
    l1Price: optionalNumber(z.coerce.number().min(0, 'L1 price must be non-negative')),
    l2Price: optionalNumber(z.coerce.number().min(0, 'L2 price must be non-negative')),
    ourPrice: optionalNumber(z.coerce.number().min(0, 'Our price must be non-negative')),
    qualifiedPartiesScreenshot: optionalString,
    finalResultScreenshot: optionalString,
});

export const UploadResultSchema = z.object({
    technicallyQualified: requiredEnumField(['Yes', 'No']),
    disqualificationReason: optionalString,
    qualifiedPartiesCount: optionalTextField(50),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    tenderCancelledScreenshot: optionalString,
    details: z.array(ResultDetailSchema).optional(),
}).passthrough();

export const UploadChangeStatusResultSchema = z.object({
    statusId: z.number({ required_error: "Status ID is required" }),
    finalResultScreenshot: z.string({ required_error: "No screenshot uploaded" }),
    resultReason: z.string({ required_error: "Reason for Cancellation is required" }),
});

export type UploadResultDto = z.infer<typeof UploadResultSchema>;
export type UploadChangeStatusResultDto = z.infer<typeof UploadChangeStatusResultSchema>;
