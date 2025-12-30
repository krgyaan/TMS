import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    dateField,
    decimalField,
    optionalNumber,
} from '@/utils/zod-schema-generator';

/**
 * Schedule RA Schema - Based on reverseAuctions table (schedule fields)
 */
export const ScheduleRaSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No'], {
        required_error: 'Technical qualification status is required',
    }),
    disqualificationReason: optionalString,
    qualifiedPartiesCount: optionalTextField(50),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    raStartTime: dateField,
    raEndTime: dateField,
});

export type ScheduleRaDto = z.infer<typeof ScheduleRaSchema>;

/**
 * Upload RA Result Schema - Based on reverseAuctions table (result fields)
 */
export const UploadRaResultSchema = z.object({
    raResult: z.enum(['Won', 'Lost', 'H1 Elimination'], {
        required_error: 'RA result is required',
    }),
    veL1AtStart: z.enum(['Yes', 'No'], {
        required_error: 'VE L1 at start status is required',
    }),
    raStartPrice: optionalNumber(z.coerce.number().min(0, 'RA start price must be non-negative')),
    raClosePrice: optionalNumber(z.coerce.number().min(0, 'RA close price must be non-negative')),
    raCloseTime: dateField,
    screenshotQualifiedParties: optionalString,
    screenshotDecrements: optionalString,
    finalResultScreenshot: optionalString,
});

export type UploadRaResultDto = z.infer<typeof UploadRaResultSchema>;
