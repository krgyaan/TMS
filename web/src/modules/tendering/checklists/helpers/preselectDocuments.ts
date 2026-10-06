import {
    STANDARD_CHECKLIST_DOCUMENTS,
    STANDARD_DOCUMENT_OPTIONS,
    STANDARD_DOC_ID_TO_NAME,
} from './standardDocuments.constant';
import type { SuggestedBiddingRequirement } from './documentChecklist.types';

export {
    STANDARD_CHECKLIST_DOCUMENTS,
    STANDARD_DOCUMENT_OPTIONS,
    STANDARD_DOC_ID_TO_NAME,
};

/**
 * Resolves a SuggestedBiddingRequirement to its canonical standard document name
 * using the shared master standard documents constant.
 */
export function resolveStandardDocValue(requirement: SuggestedBiddingRequirement): string | null {
    // 1. Direct match by standard document ID (e.g. 'std:pan_gst')
    if (requirement.matchedLibraryId && STANDARD_DOC_ID_TO_NAME[requirement.matchedLibraryId]) {
        return STANDARD_DOC_ID_TO_NAME[requirement.matchedLibraryId];
    }

    const nameLower = (requirement.documentName || '').trim().toLowerCase();

    // 2. Exact match by option value
    for (const opt of STANDARD_DOCUMENT_OPTIONS) {
        if (nameLower === opt.value.toLowerCase()) {
            return opt.value;
        }
    }

    // 3. Robust substring heuristics for standard documents
    if (nameLower.includes('pan') || nameLower.includes('gst')) return 'PAN & GST';
    if (nameLower.includes('msme') || nameLower.includes('udyam')) return 'MSME';
    if (nameLower.includes('cheque')) return 'Cancelled Cheque';
    if (
        nameLower.includes('incorporation') ||
        nameLower.includes('partnership deed') ||
        nameLower.includes('firm registration')
    ) {
        return 'Incorporation/Registration';
    }
    if (
        nameLower.includes('power of attorney') ||
        nameLower.includes('board resolution') ||
        nameLower.includes('poa')
    ) {
        return 'Board Resolution/POA';
    }
    if (nameLower.includes('electrical license') || nameLower.includes('esa license')) {
        return 'Electrical License';
    }
    if (nameLower.includes('mandate form') || nameLower.includes('bank mandate')) {
        return 'Mandate form';
    }

    return null;
}

export interface ComputePreselectedParams {
    currentSelected: string[];
    requirements?: SuggestedBiddingRequirement[] | null;
    mode: 'create' | 'edit';
    existingSelectedDocuments?: string[] | null;
}

/**
 * Preselection Rule (Phase 1C):
 * Runs ONLY for a new checklist (mode === 'create') or an empty selection.
 * NEVER overrides or re-ticks user-unticked items on an existing checklist (mode === 'edit').
 */
export function computeAutoPreselectedDocuments({
    currentSelected,
    requirements,
    mode,
    existingSelectedDocuments,
}: ComputePreselectedParams): {
    updated: boolean;
    selectedDocuments: string[];
} {
    if (!requirements || requirements.length === 0) {
        return { updated: false, selectedDocuments: currentSelected };
    }

    const hasExistingSavedSelection =
        Array.isArray(existingSelectedDocuments) && existingSelectedDocuments.length > 0;

    // Rule: On existing checklists with a saved selection, NEVER override user choices
    if (mode === 'edit' && hasExistingSavedSelection) {
        return { updated: false, selectedDocuments: currentSelected };
    }

    const matchedStandards: string[] = [];
    for (const req of requirements) {
        const val = resolveStandardDocValue(req);
        if (val && !matchedStandards.includes(val)) {
            matchedStandards.push(val);
        }
    }

    if (matchedStandards.length === 0) {
        return { updated: false, selectedDocuments: currentSelected };
    }

    const merged = Array.from(new Set([...currentSelected, ...matchedStandards]));
    const isChanged =
        merged.length !== currentSelected.length ||
        !merged.every((item) => currentSelected.includes(item));

    return {
        updated: isChanged,
        selectedDocuments: merged,
    };
}
