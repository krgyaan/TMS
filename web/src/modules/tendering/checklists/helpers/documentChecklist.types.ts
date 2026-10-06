import type { DocumentChecklistFormValues } from './documentChecklist.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

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

export interface TenderDocumentChecklistDashboardRowWithTimer extends TenderDocumentChecklistDashboardRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}

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
 * AI-suggested bidding requirement, returned by
 * GET /document-checklists/tender/:tenderId/bidding-requirements
 * (VolksAI's /analyze-bidding-requirements, bridged through the API).
 */
export interface SuggestedBiddingRequirement {
    documentName: string;
    category: 'oem' | 'standard' | 'company' | 'other';
    required: boolean;
    source: {
        document: 'main' | 'atc';
        page: number;
        snippet: string;
    };
    matchedLibraryId: string | null;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
}

/**
 * An annexure/form identified in the tender documents. Only the fields the UI shows are
 * typed; the structured `blocks` stay server-side (the .docx is rendered by the API).
 */
export interface SuggestedAnnexure {
    annexureName: string;
    source: {
        document: 'main' | 'atc';
        page: number;
        snippet: string;
    };
}

export interface BiddingRequirementsAnalysisResult {
    jobId: string;
    requirements: SuggestedBiddingRequirement[];
    /** Absent on payloads that predate annexure extraction; its array index is the download index. */
    annexures?: SuggestedAnnexure[];
    llmUsage: Record<string, unknown> | null;
}

/**
 * GET /document-checklists/tender/:tenderId/bidding-requirements/cached -- cache-only read;
 * `analysis` is null when the tender has no current cached analysis. Never runs VolksAI.
 */
export interface CachedBiddingRequirementsResponse {
    analysis: BiddingRequirementsAnalysisResult | null;
}

export interface BiddingRequirementsJobStatusResponse {
    jobId: number | null;
    tenderId: number;
    status: 'idle' | 'pending' | 'running' | 'done' | 'failed';
    documentHash: string | null;
    analysis: BiddingRequirementsAnalysisResult | null;
    error: {
        code: string;
        message: string;
    } | null;
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
