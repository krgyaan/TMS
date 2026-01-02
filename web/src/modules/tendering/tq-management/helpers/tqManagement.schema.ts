import { z } from 'zod';

/**
 * Schema for TQ received form
 */
export const TqReceivedFormSchema = z.object({
    tenderId: z.number(),
    tqSubmissionDeadline: z.string().min(1, 'TQ submission deadline is required'),
    tqDocumentReceived: z.array(z.string()).default([]),
    tqItems: z.array(z.object({
        tqTypeId: z.coerce.number({ error: 'TQ type is required' }).min(1, 'TQ type is required'),
        queryDescription: z.string().min(1, 'Query description is required'),
    })).min(1, 'At least one TQ item is required'),
});

export type TqReceivedFormValues = z.infer<typeof TqReceivedFormSchema>;

/**
 * Schema for TQ replied form
 */
export const TqRepliedFormSchema = z.object({
    repliedDatetime: z.string().min(1, 'TQ reply date and time is required'),
    repliedDocument: z.array(z.string()).default([]),
    proofOfSubmission: z.array(z.string()).min(1, 'Proof of submission is required'),
});

export type TqRepliedFormValues = z.infer<typeof TqRepliedFormSchema>;

/**
 * Schema for TQ missed form
 */
export const TqMissedFormSchema = z.object({
    missedReason: z.string().min(10, 'Reason must be at least 10 characters'),
    preventionMeasures: z.string().min(10, 'Prevention measures must be at least 10 characters'),
    tmsImprovements: z.string().min(10, 'TMS improvements must be at least 10 characters'),
});

export type TqMissedFormValues = z.infer<typeof TqMissedFormSchema>;
