// Pure citation-display logic for AI-extracted fields. Kept free of React and
// path aliases so it can be unit-tested directly with `node --test`.

export type UnlocatedReason = 'no_source_record' | 'value_changed_after_extraction' | 'no_page_recorded';

export interface FieldSourceCitation {
    value: unknown;
    raw_value: string | null;
    page: number | null;
    snippet: string | null;
    confidence?: number;
    status?: string;
    /** False when no verified page supports this value (see unlocated_reason). */
    located?: boolean;
    unlocated_reason?: UnlocatedReason | null;
    /** Only on `sources.unlocated`: which document the value came from, if known. */
    document?: 'main_tender' | 'atc' | null;
}

export interface FieldSources {
    self_classified_atc: boolean;
    has_conflict: boolean;
    main_tender: FieldSourceCitation | null;
    atc: FieldSourceCitation | null;
    located?: boolean;
    /** Set when the value has no verified location in either document. */
    unlocated?: FieldSourceCitation | null;
}

export const UNLOCATED_REASON_TEXT: Record<UnlocatedReason, string> = {
    no_source_record: 'No page or passage in the tender documents was matched to this value.',
    value_changed_after_extraction:
        'This value was changed after the document was read (for example by AI resolution), so the originally captured page no longer supports it.',
    no_page_recorded: 'Matching text was captured, but the page it came from was not recorded.',
};

/**
 * True only for a citation backed by a real page. Extractions saved before the
 * `located` flag existed had fabricated "page 1, empty snippet" citations, so for
 * those a page without a snippet is treated as unverified.
 */
export function isCitationLocated(citation?: FieldSourceCitation | null): boolean {
    if (!citation) return false;
    const hasPage = typeof citation.page === 'number' && citation.page >= 1;
    if (typeof citation.located === 'boolean') return citation.located && hasPage;
    return hasPage && Boolean(citation.snippet);
}

export type CitationOrigin = 'main_tender' | 'atc' | 'ai' | 'unknown';

export type CitationView =
    | {
          kind: 'conflict';
          main: FieldSourceCitation | null;
          atc: FieldSourceCitation | null;
          mainLocated: boolean;
          atcLocated: boolean;
      }
    | { kind: 'located'; citation: FieldSourceCitation; document: 'main_tender' | 'atc' }
    | { kind: 'unverified'; reason: UnlocatedReason; origin: CitationOrigin; snippet: string | null }
    | { kind: 'missing' }
    | { kind: 'message' };

export interface CitationViewInput {
    sources?: FieldSources | null;
    /** Canonical field source from the API: 'regex' | 'atc' | 'llm' | null. */
    source?: string | null;
    /** Indicator type: 'high' | 'fallback' | 'low' | 'missing'. */
    type: string;
    /** Field is one the LLM fallback commonly fills. */
    isLlmField?: boolean;
}

/** Decides which citation state a field's popover shows. */
export function resolveCitationView({ sources, source, type, isLlmField = false }: CitationViewInput): CitationView {
    const main = sources?.main_tender ?? null;
    const atc = sources?.atc ?? null;
    const mainLocated = isCitationLocated(main);
    const atcLocated = isCitationLocated(atc);

    if (sources?.has_conflict) {
        return { kind: 'conflict', main, atc, mainLocated, atcLocated };
    }

    if (atcLocated && atc) return { kind: 'located', citation: atc, document: 'atc' };
    if (mainLocated && main) return { kind: 'located', citation: main, document: 'main_tender' };

    if (type === 'missing') return { kind: 'missing' };

    const isLlmValue = source === 'llm' || isLlmField || type === 'fallback';
    const unverified = sources?.unlocated ?? atc ?? main ?? null;
    if (!unverified && !isLlmValue) return { kind: 'message' };

    const reason: UnlocatedReason =
        unverified?.unlocated_reason ?? (unverified?.snippet ? 'no_page_recorded' : 'no_source_record');

    let origin: CitationOrigin;
    const document = unverified?.document ?? (unverified === atc && atc ? 'atc' : unverified === main && main ? 'main_tender' : null);
    if (document === 'atc' || document === 'main_tender') origin = document;
    else origin = isLlmValue ? 'ai' : 'unknown';

    return {
        kind: 'unverified',
        reason,
        origin,
        snippet: reason === 'no_page_recorded' ? unverified?.snippet ?? null : null,
    };
}
