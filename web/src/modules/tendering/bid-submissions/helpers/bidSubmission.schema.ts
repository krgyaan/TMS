import { z } from 'zod';

/**
 * Schema for submitting a bid
 */
export const SubmitBidFormSchema = z.object({
    tenderId: z.number(),
    submissionDatetime: z.string().min(1, 'Bid submission date and time is required'),
    submittedDocs: z.array(z.string()).default([]),
    proofOfSubmission: z.array(z.string()).min(1, 'Proof of submission is required'),
    finalPriceSs: z.array(z.string()).min(1, 'Final bidding price screenshot is required'),
    finalBiddingPrice: z.string().optional(),
});

export type SubmitBidFormValues = z.infer<typeof SubmitBidFormSchema>;

/**
 * Schema for marking a tender as missed
 */
export const MarkAsMissedFormSchema = z.object({
    tenderId: z.number(),
    reasonForMissing: z.string().min(10, 'Reason must be at least 10 characters'),
    preventionMeasures: z.string().min(10, 'Prevention measures must be at least 10 characters'),
    tmsImprovements: z.string().min(10, 'TMS improvements must be at least 10 characters'),
});

export type MarkAsMissedFormValues = z.infer<typeof MarkAsMissedFormSchema>;
