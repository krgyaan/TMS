import type { BiddingRequirementsAnalysisResult } from './documentChecklist.types';

export interface SuggestionPanelInput {
    /** Result of the page-load cache-only read (null = never analysed, undefined = not loaded yet). */
    cached: BiddingRequirementsAnalysisResult | null | undefined;
    cacheLoading: boolean;
    /** Result of an analysis the user ran in this session, if any. */
    fresh?: BiddingRequirementsAnalysisResult | undefined;
    analyzing: boolean;
    status?: 'idle' | 'pending' | 'running' | 'done' | 'failed';
    error?: string | null;
    failed?: boolean;
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
    /** True while a fresh analysis is actively running. */
    analyzing: boolean;
    /** True when no analysis exists, not loading cache, and not actively analyzing. */
    notAnalysedYet: boolean;
    /** True when analysis has failed. */
    failed: boolean;
    /** Current status string: idle | pending | running | done | failed. */
    status: 'idle' | 'pending' | 'running' | 'done' | 'failed';
    /** Error message if failed. */
    error: string | null;
}

/**
 * Decides what the "Suggested Requirements (AI)" panel shows. A completed analysis is
 * visible on page load straight from the cache; "Analyze" is only offered when nothing
 * is cached, and forcing a new run is a separate "Re-analyze" action.
 */
export function resolveSuggestionPanel({
    cached,
    cacheLoading,
    fresh,
    analyzing,
    status: inputStatus,
    error: inputError,
    failed: inputFailed,
}: SuggestionPanelInput): SuggestionPanelState {
    const analysis = fresh ?? cached ?? null;
    const checkingCache = cacheLoading && !analysis;
    const isAnalyzing = analyzing || inputStatus === 'running' || inputStatus === 'pending';
    const hasFailed = Boolean(inputFailed || inputError || inputStatus === 'failed');

    let status: 'idle' | 'pending' | 'running' | 'done' | 'failed' = 'idle';
    if (analysis) {
        status = 'done';
    } else if (isAnalyzing) {
        status = inputStatus === 'pending' ? 'pending' : 'running';
    } else if (hasFailed) {
        status = 'failed';
    } else {
        status = 'idle';
    }

    const notAnalysedYet = !analysis && !checkingCache && !isAnalyzing && !hasFailed;

    return {
        analysis,
        showAnalyze: notAnalysedYet,
        showReanalyze: !!analysis && !isAnalyzing,
        checkingCache,
        analyzing: isAnalyzing,
        notAnalysedYet,
        failed: hasFailed,
        status,
        error: inputError ?? null,
    };
}
