import { z } from 'zod';

/**
 * Schema for scheduling a reverse auction
 */
export const ScheduleRaSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
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
    if (data.technicallyQualified === 'Yes' && !data.raStartTime) {
        return false;
    }
    return true;
}, {
    message: 'RA Start Time is required when qualified',
    path: ['raStartTime'],
}).refine((data) => {
    if (data.technicallyQualified === 'Yes' && !data.raEndTime) {
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
    raResult: z.enum(['Won', 'Lost', 'H1 Elimination']),
    veL1AtStart: z.enum(['Yes', 'No']),
    raStartPrice: z.string().optional(),
    raClosePrice: z.string().optional(),
    raCloseTime: z.string().optional(),
    screenshotQualifiedParties: z.array(z.string()).default([]),
    screenshotDecrements: z.array(z.string()).default([]),
    finalResultScreenshot: z.array(z.string()).default([]),
});

export type UploadRaResultFormValues = z.infer<typeof UploadRaResultSchema>;
