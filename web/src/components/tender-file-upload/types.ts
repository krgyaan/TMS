export type TenderFileContext =
    | 'tender-documents'
    | 'bg-format-files'
    | 'bg-po-files'
    | 'emds'
    | 'tender-fees'
    | 'physical-docs'
    | 'rfqs'
    | 'rfq-scope-of-work'
    | 'rfq-tech-specs'
    | 'rfq-detailed-boq'
    | 'rfq-maf-format'
    | 'rfq-mii-format'
    | 'info-sheets'
    | 'costing-sheets'
    | 'bid-submitted-docs'
    | 'bid-submission-proof'
    | 'bid-final-price-ss'
    | 'tender-results'
    | 'checklists'
    | 'tq-management'
    | 'screenshot_qualified_parties'
    | 'screenshot_decrements'
    | 'final_result_screenshot'
    | 'result-screenshots'
    | 'bg-format-imran'
    | 'bg-prefilled-signed'
    | 'bg-sfms-conf'
    | 'bg-fdr-copy'
    | 'bg-ext-letter'
    | 'bg-docket-slip'
    | 'bg-stamp-covering-letter'
    | 'bg-cancell-confirm'
    | 'fdr-format-imran'
    | 'fdr-prefilled-signed'
    | 'fdr-sfms-confirmation'
    | 'fdr-request-letter-email'
    | 'fdr-docket-slip'
    | 'fdr-covering-letter'
    | 'fdr-req-receive'
    | 'dd-format-imran'
    | 'dd-prefilled-signed'
    | 'dd-request-letter-email'
    | 'dd-docket-slip'
    | 'dd-covering-letter'
    | 'cheque-format-imran'
    | 'cheque-prefilled-signed'
    | 'cheque-images'
    | 'cheque-docket-slip'
    | 'cheque-covering-letter'
    | 'cheque-cancelled-image'
    | 'cheque-receiving-handed-over'
    | 'cheque-positive-pay-confirmation';

export interface FileConfig {
    context: string;
    maxFiles: number;
    maxSizeBytes: number;
    maxSizeFormatted: string;
    allowedExtensions: string[];
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
