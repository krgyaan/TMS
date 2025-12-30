import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    optionalNumber,
    decimalField,
    requiredEnumField,
} from '@/utils/zod-schema-generator';

/**
 * Upload Result Schema - Based on tenderResults table
 */
export const UploadResultSchema = z.object({
    technicallyQualified: requiredEnumField(['Yes', 'No']),
    disqualificationReason: optionalString,
    qualifiedPartiesCount: optionalTextField(50),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    result: z.enum(['Won', 'Lost']).optional(),
    l1Price: optionalNumber(z.coerce.number().min(0, 'L1 price must be non-negative')),
    l2Price: optionalNumber(z.coerce.number().min(0, 'L2 price must be non-negative')),
    ourPrice: optionalNumber(z.coerce.number().min(0, 'Our price must be non-negative')),
    qualifiedPartiesScreenshot: optionalString,
    finalResultScreenshot: optionalString,
});

export type UploadResultDto = z.infer<typeof UploadResultSchema>;
