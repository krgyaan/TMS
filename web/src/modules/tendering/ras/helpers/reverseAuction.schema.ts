import { z } from 'zod';

/**
 * Schema for scheduling a reverse auction
 */
export const ScheduleRaSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
    raOutcome: z.enum(['RA Scheduled', 'H1 Elimination']),
    disqualificationReason: z.string().optional(),
    qualifiedPartiesCount: z.string().optional(),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    raStartTime: z.string().optional(),
    raEndTime: z.string().optional(),
}).refine((data) => {
    if (data.technicallyQualified === 'No' && !data.disqualificationReason) {
        return false;
    }
    return true;
}, {
    message: 'Disqualification reason is required when not qualified',
    path: ['disqualificationReason'],
}).refine((data) => {
    if (data.technicallyQualified === 'Yes' && data.raOutcome === 'RA Scheduled' && !data.raStartTime) {
        return false;
    }
    return true;
}, {
    message: 'RA Start Time is required when qualified',
    path: ['raStartTime'],
}).refine((data) => {
    if (data.technicallyQualified === 'Yes' && data.raOutcome === 'RA Scheduled' && !data.raEndTime) {
        return false;
    }
    return true;
}, {
    message: 'RA End Time is required when qualified',
    path: ['raEndTime'],
});

export type ScheduleRaFormValues = z.infer<typeof ScheduleRaSchema>;

/**
 * Schema for uploading RA result
 */
export const UploadRaResultSchema = z.object({
    raResult: z.enum(['Won', 'Lost']),
    veL1AtStart: z.enum(['Yes', 'No']),
    raStartPrice: z.string().optional(),
    raClosePrice: z.string().optional(),
    raClosePriceL2: z.string().optional(),
    raOurPrice: z.string().optional(),
    raCloseTime: z.string().optional(),
    resultReason: z.string().optional(),
    screenshotQualifiedParties: z.array(z.string()).default([]),
    screenshotDecrements: z.array(z.string()).default([]),
    finalResultScreenshot: z.array(z.string()).default([]),
});

export type UploadRaResultFormValues = z.infer<typeof UploadRaResultSchema>;
