export type TenderFileContext =
    | 'tender-documents'
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
    | 'reverse-auctions'
    | 'ra-screenshots'
    | 'result-screenshots';

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
