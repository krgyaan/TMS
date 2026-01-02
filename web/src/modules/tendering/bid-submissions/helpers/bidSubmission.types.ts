import type { BidSubmission } from '@/types/api.types';
import type { SubmitBidFormValues, MarkAsMissedFormValues } from './bidSubmission.schema';

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
