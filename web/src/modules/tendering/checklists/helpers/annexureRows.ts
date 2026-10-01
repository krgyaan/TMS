import type { BiddingRequirementsAnalysisResult } from './documentChecklist.types';

export interface AnnexureRow {
    /** Position in the analysis's `annexures[]` -- the index the download endpoint takes. */
    index: number;
    name: string;
    citation: string;
}

/**
 * Rows for the "Annexures & Forms" section. Empty when there is no analysis or it found
 * no annexures, in which case the section is not rendered at all.
 */
export function buildAnnexureRows(analysis: BiddingRequirementsAnalysisResult | null | undefined): AnnexureRow[] {
    return (analysis?.annexures ?? []).map((annexure, index) => ({
        index,
        name: annexure.annexureName,
        citation: `${annexure.source.document === 'main' ? 'Main' : 'ATC'} p.${annexure.source.page}: "${annexure.source.snippet}"`,
    }));
}
