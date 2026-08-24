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
 * Schema for enquiry-based quotation submission (no proof / screenshot required)
 */
export const EnquirySubmitBidFormSchema = z.object({
    tenderId: z.number(),
    submissionDatetime: z.string().min(1, 'Quotation submission date and time is required'),
    submittedDocs: z.array(z.string()).length(1, 'Exactly one quotation document is required'),
    finalBiddingPrice: z.string().optional(),
});

export type EnquirySubmitBidFormValues = z.infer<typeof EnquirySubmitBidFormSchema>;

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

export const GlobalBidMissedFormSchema = z.object({
    tenderId: z.number(),
    rejectionStatus: z.number().min(1, 'Status is required'),
    preventionMeasures: z.string().optional(),
    tmsImprovements: z.string().optional(),
});

export type GlobalBidMissedFormValues = z.infer<typeof GlobalBidMissedFormSchema>;
