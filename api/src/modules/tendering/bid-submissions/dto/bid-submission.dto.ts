import { z } from 'zod';
import {
    optionalString,
    optionalNumber,
    requiredDateField,
    dateField,
    decimalField,
    bigintField,
    textField,
    jsonbField,
} from '@/utils/zod-schema-generator';

/**
 * Bid Documents Schema - Based on BidDocuments interface
 */
const BidDocumentsSchema = z.object({
    submittedDocs: z.array(z.string()).min(1).max(3, 'Maximum 3 documents allowed'),
    submissionProof: z.string().nullable(),
    finalPriceSs: z.string().nullable(),
});

/**
 * Submit Bid Schema - Based on bidSubmissions table (Bid Submitted status)
 */
export const SubmitBidSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    submissionDatetime: requiredDateField,
    submittedDocs: z.array(z.string()).min(1, 'At least one document is required').max(3, 'Maximum 3 documents allowed'),
    proofOfSubmission: textField().min(1, 'Proof of submission is required'),
    finalPriceSs: textField().min(1, 'Final price screenshot is required'),
    finalBiddingPrice: optionalNumber(z.coerce.number().min(0, 'Final bidding price must be non-negative')),
});

export type SubmitBidDto = z.infer<typeof SubmitBidSchema>;

/**
 * Mark As Missed Schema - Based on bidSubmissions table (Tender Missed status)
 */
export const MarkAsMissedSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    reasonForMissing: textField().min(1, 'Reason for missing is required'),
    preventionMeasures: textField().min(1, 'Prevention measures are required'),
    tmsImprovements: textField().min(1, 'TMS improvements are required'),
});

export type MarkAsMissedDto = z.infer<typeof MarkAsMissedSchema>;

/**
 * Update Bid Submission Schema - Partial update schema
 */
export const UpdateBidSubmissionSchema = z.object({
    submissionDatetime: dateField,
    submittedDocs: z.array(z.string()).min(1).max(3, 'Maximum 3 documents allowed').optional(),
    proofOfSubmission: optionalString,
    finalPriceSs: optionalString,
    finalBiddingPrice: optionalNumber(z.coerce.number().min(0, 'Final bidding price must be non-negative')),
    reasonForMissing: optionalString,
    preventionMeasures: optionalString,
    tmsImprovements: optionalString,
});

export type UpdateBidSubmissionDto = z.infer<typeof UpdateBidSubmissionSchema>;
