import { z } from 'zod';

export const ResultDetailSchema = z.object({
    result: z.enum(['Won', 'Lost', 'Cancelled']).optional(),
    resultReason: z.string().optional(),
    l1Price: z.string().optional(),
    l2Price: z.string().optional(),
    ourPrice: z.string().optional(),
    qualifiedPartiesScreenshot: z.string().optional(),
    finalResultScreenshot: z.string().optional(),
});

export const UploadResultSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
    disqualificationReason: z.string().optional(),
    qualifiedPartiesCount: z.string().optional(),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    tenderCancelledScreenshot: z.string().optional(),
    details: z.array(ResultDetailSchema).optional(),
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
