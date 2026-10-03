import type { BiddingRequirementsAnalysisResult } from './documentChecklist.types';

export interface SuggestionPanelInput {
    /** Result of the page-load cache-only read (null = never analysed, undefined = not loaded yet). */
    cached: BiddingRequirementsAnalysisResult | null | undefined;
    cacheLoading: boolean;
    /** Result of an analysis the user ran in this session, if any. */
    fresh: BiddingRequirementsAnalysisResult | undefined;
    analyzing: boolean;
}

export interface SuggestionPanelState {
    /** What to display: a run from this session wins over the cached one. */
    analysis: BiddingRequirementsAnalysisResult | null;
    /** No result exists yet: offer the first analysis. */
    showAnalyze: boolean;
    /** A result exists: offer an explicit, forced re-analysis instead. */
    showReanalyze: boolean;
    /** Still checking the cache on load: offer neither button yet (avoids a needless paid run). */
    checkingCache: boolean;
}

/**
 * Decides what the "Suggested Requirements (AI)" panel shows. A completed analysis is
 * visible on page load straight from the cache; "Analyze" is only offered when nothing
 * is cached, and forcing a new run is a separate "Re-analyze" action.
 */
export function resolveSuggestionPanel({ cached, cacheLoading, fresh, analyzing }: SuggestionPanelInput): SuggestionPanelState {
    const analysis = fresh ?? cached ?? null;
    const checkingCache = cacheLoading && !analysis;
    return {
        analysis,
        showAnalyze: !analysis && !checkingCache && !analyzing,
        showReanalyze: !!analysis && !analyzing,
        checkingCache,
    };
}
