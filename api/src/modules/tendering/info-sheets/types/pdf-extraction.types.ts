export interface VolksAiExtractionPayload {
    tenderId: number;
    pdfPath: string;
    mainTenderPath: string;
    atcPaths: string[];
    boqPath: string | null;
    userId: number;
    force?: boolean;
}

export interface PdfExtractionJobData {
    tenderId: number;
    pdfPath: string;
    mainTenderPath?: string;
    atcPaths?: string[];
    boqPath?: string | null;
    userId: number;
    force?: boolean;
}

export interface FieldSourceCitation {
    value: unknown;
    raw_value: string;
    page: number;
    snippet: string;
    confidence?: number;
    status?: string;
}

export interface FieldSources {
    self_classified_atc: boolean;
    has_conflict: boolean;
    main_tender: FieldSourceCitation | null;
    atc: FieldSourceCitation | null;
}

export interface PdfExtractionFieldValue<T = unknown> {
    value: T;
    confidence: 'high' | 'medium' | 'low' | 'not_applicable' | string;
    source: string | null;
    sources?: FieldSources;
}

export interface PdfExtractionJobResult {
    extraction_version: string;
    fields: Record<string, PdfExtractionFieldValue>;
    missing_fields: string[];
    processing_time_ms: number;
    llm_usage?: Record<string, any>;
    self_classified_atc?: boolean;
    has_atc?: boolean;
    ambiguous_field_conflicts?: Record<string, any>;
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
