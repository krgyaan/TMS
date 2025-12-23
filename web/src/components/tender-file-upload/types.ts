export type TenderFileContext =
    | 'tender-documents'
    | 'emds'
    | 'tender-fees'
    | 'physical-docs'
    | 'rfqs'
    | 'info-sheets'
    | 'costing-sheets'
    | 'bid-submissions'
    | 'tender-results'
    | 'checklists'
    | 'tq-management'
    | 'reverse-auctions';

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
