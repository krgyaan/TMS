/**
 * Known upload contexts for editor autocomplete. This is a suggestion list
 * only — FileContext accepts any string, and the backend validates the context
 * at runtime (unknown contexts return a 400 + the uploader falls back to its
 * default config). Kept in sync with api/src/modules/file-upload/config/.
 */
export const KNOWN_CONTEXTS = [
    // tendering
    'tender-documents', 'emds', 'tender-fees', 'physical-docs', 'rfqs',
    'rfq-scope-of-work', 'rfq-tech-specs', 'rfq-detailed-boq', 'rfq-maf-format',
    'rfq-mii-format', 'rfq-response-quotation', 'rfq-response-technical',
    'rfq-response-maf', 'rfq-response-mii', 'info-sheets', 'costing-sheets',
    'bid-submitted-docs', 'bid-submission-proof', 'bid-final-price-ss',
    'tender-results', 'checklists', 'tq-management', 'screenshot_qualified_parties',
    'screenshot_decrements', 'final_result_screenshot', 'result-screenshots',
    'tender-rejection-proof', 'cancel-tender',
    // bi-dashboard
    'bg-format-files', 'bg-po-files', 'bg-format-imran', 'bg-prefilled-signed',
    'bg-sfms-conf', 'bg-fdr-copy', 'bg-ext-letter', 'bg-docket-slip',
    'bg-stamp-covering-letter', 'bg-cancell-confirm', 'fdr-format-imran',
    'fdr-prefilled-signed', 'fdr-sfms-confirmation', 'fdr-request-letter-email',
    'fdr-docket-slip', 'fdr-covering-letter', 'fdr-req-receive', 'dd-format-imran',
    'dd-prefilled-signed', 'dd-request-letter-email', 'dd-docket-slip',
    'dd-covering-letter', 'cheque-format-imran', 'cheque-prefilled-signed',
    'cheque-images', 'cheque-docket-slip', 'cheque-covering-letter',
    'cheque-cancelled-image', 'cheque-receiving-handed-over',
    'cheque-positive-pay-confirmation',
    // operations
    'mcaClosure', 'wo-draft', 'wo-signed-copy', 'final-wo', 'detailed-wo',
    'kickoff-mom', 'contract-agreement', 'payment-proof', 'project-closure',
    // services
    'amc-po', 'amc-service-report', 'amc-invoices', 'amc-receipts',
    'amc-service-reports', 'customer-attachments',
    // shared
    'pqr-po', 'pqr-sap-gem-po', 'pqr-completion', 'pqr-performance-certificate',
    'finance-document',
    // accounts
    'bankLoanSchedule', 'sanctionLetter', 'tdsDocument', 'bankNoc',
    'follow-ups', 'delegation-attachment', 'delegation-proof',

    // hrms
    'complaints',

    // insurance
    'insurances',
    // crm
    'lead-followups',
] as const;

export type FileContext = (typeof KNOWN_CONTEXTS)[number] | (string & {});

export interface FileConfig {
    context: string;
    maxFiles: number;
    maxSizeBytes: number;
    maxSizeFormatted: string;
    allowedExtensions: string[];
    allowedMimeTypes?: string[];
    storageDir?: string;
}

export interface UploadedFile {
    originalName: string;
    fileName: string;
    path: string;
    fullPath: string;
    mimeType: string;
    size: number;
    sizeFormatted: string;
}

export interface UploadResult {
    success: boolean;
    files: UploadedFile[];
    errors: Array<{ fileName: string; error: string }>;
}