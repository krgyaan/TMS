import type { DocumentChecklistFormValues } from './documentChecklist.schema';

export interface ExtraDocument {
    name: string;
    path?: string;
}

export interface TenderDocumentChecklist {
    id: number;
    tenderId: number;
    selectedDocuments: string[] | null;
    extraDocuments: ExtraDocument[] | null;
    submittedBy: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface CreateDocumentChecklistDto {
    tenderId: number;
    selectedDocuments?: string[];
    extraDocuments?: ExtraDocument[];
}

export interface UpdateDocumentChecklistDto {
    id: number;
    tenderId: number;
    selectedDocuments?: string[];
    extraDocuments?: ExtraDocument[];
}

export type TenderDocumentChecklistDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    gstValues: number;
    checklistSubmitted: boolean;
};

export interface DocumentChecklistsDashboardCounts {
    pending: number;
    submitted: number;
    "tender-dnb": number;
    total: number;
}

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
