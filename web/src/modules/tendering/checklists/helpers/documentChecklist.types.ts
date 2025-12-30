import type { TenderDocumentChecklist } from '@/types/api.types';
import type { DocumentChecklistFormValues } from './documentChecklist.schema';

/**
 * Tender details for document checklist forms
 */
export interface TenderDetails {
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberName: string | null;
}

/**
 * Props for DocumentChecklistForm component
 */
export interface DocumentChecklistFormProps {
    tenderId: number;
    tenderDetails: TenderDetails;
    mode: 'create' | 'edit';
    existingData?: TenderDocumentChecklist;
}

/**
 * Standard document options for checklist
 */
export const standardDocumentOptions = [
    { value: 'PAN & GST', label: 'PAN & GST' },
    { value: 'MSME', label: 'MSME' },
    { value: 'Cancelled Cheque', label: 'Cancelled Cheque' },
    { value: 'Incorporation/Registration', label: 'Incorporation/Registration' },
    { value: 'Board Resolution/POA', label: 'Board Resolution/POA' },
    { value: 'Electrical License', label: 'Electrical License' },
] as const;

// Re-export form value types
export type { DocumentChecklistFormValues };
