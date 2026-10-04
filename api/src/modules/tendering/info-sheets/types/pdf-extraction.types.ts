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
    raw_value: string | null;
    /** null when no verified page is known -- never a guessed page. */
    page: number | null;
    snippet: string | null;
    confidence?: number;
    status?: string;
    located?: boolean;
    unlocated_reason?: 'no_source_record' | 'value_changed_after_extraction' | 'no_page_recorded' | null;
    document?: 'main_tender' | 'atc' | null;
}

export interface FieldSources {
    self_classified_atc: boolean;
    has_conflict: boolean;
    main_tender: FieldSourceCitation | null;
    atc: FieldSourceCitation | null;
    located?: boolean;
    unlocated?: FieldSourceCitation | null;
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
    llm_status?: string;
    self_classified_atc?: boolean;
    has_atc?: boolean;
    ambiguous_field_conflicts?: Record<string, any>;
    documentIdentityCheck?: DocumentIdentityCheck;
}

/**
 * Main tender vs ATC self-stated identity (GeM bid number / tender number),
 * computed by VolksAI on every extraction. `match` is null when unverifiable.
 */
export interface DocumentIdentityCheck {
    mainDocumentNumber: string | null;
    atcDocumentNumber: string | null;
    match: boolean | null;
    status: 'match' | 'mismatch' | 'unverifiable' | 'no_atc' | 'same_document';
    basis: 'gem_bid_number' | 'tender_number' | null;
    mainNumbersFound: Record<string, number>;
    atcNumbersFound: Record<string, number>;
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
