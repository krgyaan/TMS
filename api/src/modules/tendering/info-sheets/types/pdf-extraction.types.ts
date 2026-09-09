export interface PdfExtractionJobData {
    tenderId: number;
    pdfPath: string;
    userId: number;
}

export interface PdfExtractionFieldValue<T = unknown> {
    value: T;
    confidence: 'high' | 'medium' | 'low' | 'not_applicable' | string;
    source: string | null;
}

export interface PdfExtractionJobResult {
    extraction_version: string;
    fields: Record<string, PdfExtractionFieldValue>;
    missing_fields: string[];
    processing_time_ms: number;
}

export type PdfExtractionJobState =
    | 'waiting'
    | 'active'
    | 'completed'
    | 'failed'
    | 'delayed'
    | 'unknown';

export interface PdfExtractionJobStatusResponse {
    jobId: string;
    state: PdfExtractionJobState;
    progress?: unknown;
    data?: PdfExtractionJobData;
    result?: PdfExtractionJobResult | null;
    failedReason?: string | null;
}
