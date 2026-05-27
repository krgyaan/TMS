import { z } from 'zod';

/**
 * Schema for uploading tender result
 */
export const UploadResultSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
    disqualificationReason: z.string().optional(),
    qualifiedPartiesCount: z.string().optional(),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    result: z.enum(['Won', 'Lost']).optional(),
    l1Price: z.string().optional(),
    l2Price: z.string().optional(),
    ourPrice: z.string().optional(),
    qualifiedPartiesScreenshot: z.array(z.string()).default([]),
    finalResultScreenshot: z.array(z.string()).default([]),
}).refine((data) => {
    if (data.technicallyQualified === 'No' && !data.disqualificationReason) {
        return false;
    }
    return true;
}, {
    message: 'Disqualification reason is required when not qualified',
    path: ['disqualificationReason'],
});

export const ChangeStatusSchema = z.object({
    statusId: z.number({ required_error: 'Status is required' }),
    resultReason: z.string().min(5, { message: 'Reason must be at least 5 characters long' }),
    finalResultScreenshot: z.string().min(1, { message: 'Proof of cancellation is required' }),
});


export type UploadResultFormValues = z.infer<typeof UploadResultSchema>;
export type ChangeStatusDto = z.infer<typeof ChangeStatusSchema>;
