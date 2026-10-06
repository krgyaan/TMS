/**
 * Master standard document options shared between API and Web UI.
 * Standard documents are defined with unique 'std:' prefixed IDs for unambiguous
 * LLM matching and UI preselection.
 */
export interface StandardChecklistDocument {
    id: string;
    document_name: string;
    document_type: 'standard';
}

export const STANDARD_CHECKLIST_DOCUMENTS: readonly StandardChecklistDocument[] = [
    { id: 'std:pan_gst', document_name: 'PAN & GST', document_type: 'standard' },
    { id: 'std:msme', document_name: 'MSME', document_type: 'standard' },
    { id: 'std:cancelled_cheque', document_name: 'Cancelled Cheque', document_type: 'standard' },
    { id: 'std:incorporation_registration', document_name: 'Incorporation/Registration', document_type: 'standard' },
    { id: 'std:board_resolution_poa', document_name: 'Board Resolution/POA', document_type: 'standard' },
    { id: 'std:electrical_license', document_name: 'Electrical License', document_type: 'standard' },
    { id: 'std:mandate_form', document_name: 'Mandate form', document_type: 'standard' },
] as const;

export const STANDARD_DOCUMENT_OPTIONS = STANDARD_CHECKLIST_DOCUMENTS.map((doc) => ({
    value: doc.document_name,
    label: doc.document_name,
    id: doc.id,
}));

export const STANDARD_DOC_ID_TO_NAME: Record<string, string> = Object.fromEntries(
    STANDARD_CHECKLIST_DOCUMENTS.map((doc) => [doc.id, doc.document_name]),
);
