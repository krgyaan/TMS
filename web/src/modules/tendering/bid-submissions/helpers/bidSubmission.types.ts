import type { SubmitBidFormValues, MarkAsMissedFormValues } from './bidSubmission.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

export type BidSubmissionStatus = "Submission Pending" | "Bid Submitted" | "Tender Missed";

export type BidDocuments = {
    submittedDocs: string[];
    submissionProof: string | null;
    finalPriceSs: string | null;
};

export type BidSubmission = {
    id: number;
    tenderId: number;
    status: BidSubmissionStatus;
    submissionDatetime: Date | null;
    finalBiddingPrice: string | null;
    documents: BidDocuments | null;
    submittedBy: number | null;
    reasonForMissing: string | null;
    preventionMeasures: string | null;
    tmsImprovements: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type BidSubmissionDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    finalCosting: string | null;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed";
    bidSubmissionId: number | null;
    costingSheetId: number | null;
};

export interface BidSubmissionDashboardRowWithTimer extends BidSubmissionDashboardRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}

export type BidSubmissionListParams = {
    tab?: "pending" | "submitted" | "disqualified" | "tender-dnb";
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
};

export type SubmitBidDto = {
    tenderId: number;
    submissionDatetime: string;
    submittedDocs: string[];
    proofOfSubmission: string;
    finalPriceSs: string;
    finalBiddingPrice: string | null;
};

export type MarkAsMissedDto = {
    tenderId: number;
    reasonForMissing: string;
    preventionMeasures: string;
    tmsImprovements: string;
};

export type UpdateBidSubmissionDto = {
    submissionDatetime?: string;
    submittedDocs?: string[];
    proofOfSubmission?: string;
    finalPriceSs?: string;
    finalBiddingPrice?: string | null;
    reasonForMissing?: string;
    preventionMeasures?: string;
    tmsImprovements?: string;
};

export interface BidSubmissionDashboardCounts {
    pending: number;
    submitted: number;
    disqualified: number;
    "tender-dnb": number;
    total: number;
}

/**
 * Tender details for bid submission forms
 */
export interface TenderDetails {
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberName: string | null;
    emdAmount: string | null;
    gstValues: number;
    finalCosting: string | null;
}

/**
 * Props for SubmitBidForm component
 */
export interface SubmitBidFormProps {
    tenderId: number;
    tenderDetails: TenderDetails;
    mode: 'submit' | 'edit';
    existingData?: BidSubmission;
}

/**
 * Props for MarkAsMissedForm component
 */
export interface MarkAsMissedFormProps {
    tenderId: number;
    tenderDetails: TenderDetails;
    mode: 'missed' | 'edit';
    existingData?: BidSubmission;
}

// Re-export form value types
export type { SubmitBidFormValues, MarkAsMissedFormValues };
