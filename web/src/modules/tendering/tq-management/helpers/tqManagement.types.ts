import type { TenderQuery } from '@/types/api.types';
import type { TqReceivedFormValues, TqRepliedFormValues, TqMissedFormValues } from './tqManagement.schema';

/**
 * Tender details for TQ management forms
 */
export interface TenderDetails {
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberName: string | null;
}

/**
 * Props for TqReceivedForm component
 */
export interface TqReceivedFormProps {
    tenderId: number;
    tenderDetails: TenderDetails;
    mode: 'create' | 'edit';
    existingData?: TenderQuery;
}

/**
 * Props for TqRepliedForm component
 */
export interface TqRepliedFormProps {
    tqData: TenderQuery;
    tenderDetails: TenderDetails;
    mode: 'replied' | 'edit';
}

/**
 * Props for TqMissedForm component
 */
export interface TqMissedFormProps {
    tqData: TenderQuery;
    tenderDetails: TenderDetails;
    mode: 'missed' | 'edit';
}

// Re-export form value types
export type { TqReceivedFormValues, TqRepliedFormValues, TqMissedFormValues };
