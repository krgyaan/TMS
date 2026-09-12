import { tenderInfosService } from '@/services/api/tenders.service';
import { parseFileMeta } from '@/components/file-upload/helpers/fileMeta';

export type DocumentCategory = 'mainTender' | 'atc' | 'boq' | 'otherDocuments';

export interface ClassifiedDocument {
    path: string;
    name: string;
    category: DocumentCategory;
    confidence: number;
    needsConfirmation: boolean;
    reason: string;
    scores?: Record<string, number>;
}

export const CATEGORY_INFO: Record<
    DocumentCategory,
    {
        label: string;
        badgeText: string;
        badgeClass: string;
        description: string;
    }
> = {
    mainTender: {
        label: 'Main Tender Document / NIT',
        badgeText: 'AI: Main Terms',
        badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
        description: 'Single primary tender document specifying baseline scope, eligibility, and core terms.',
    },
    atc: {
        label: 'Additional Terms & Conditions (ATC)',
        badgeText: 'AI: Terms Override',
        badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
        description: 'Commercial clauses, special conditions, and buyer terms that override main tender terms.',
    },
    boq: {
        label: 'Bill of Quantities (BOQ)',
        badgeText: 'AI: Item Precedence',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        description: 'Price schedule and bill of quantities with strict line-item & quantity precedence.',
    },
    otherDocuments: {
        label: 'Other / Supporting Document',
        badgeText: 'Reference Only',
        badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
        description: 'Stored for team reference only — strictly excluded from OCR, parsing, and LLM processing.',
    },
};

/**
 * Deterministic keyword classification based on filename, mirroring document_classifier.py.
 */
export function classifyDocumentFilename(filePath: string): ClassifiedDocument {
    const meta = parseFileMeta(filePath);
    const displayName = meta.displayName;
    const lower = displayName.toLowerCase();

    // 1. BOQ (Bill of Quantities) keywords
    const boqKeywords = [
        'boq', 'bill of quantities', 'billofquantities', 'bill_of_quantities',
        'price schedule', 'priceschedule', 'price_schedule',
        'schedule of rates', 'scheduleofrates', 'schedule_of_rates',
    ];
    const isBoq = boqKeywords.some((kw) => lower.includes(kw));

    // 2. ATC (Additional Terms & Conditions)
    const atcExcludingTerms = [
        'mse', 'mii', 'gtc', 'rules', 'list-of-categories', 'catalog',
        'specification', 'spec', 'drawing', 'schedule', 'boq',
    ];
    const atcHighPriority = ['atc', 'tendoc', 'buyer1', 'buyer_uploaded'];
    const atcFallback = ['upload', 'shared', 'doc', 'buyer', 'resource'];

    const hasAtcExclusion = atcExcludingTerms.some((term) => lower.includes(term));
    const isHighAtc = !hasAtcExclusion && atcHighPriority.some((kw) => lower.includes(kw));
    const isFallbackAtc = !hasAtcExclusion && atcFallback.some((kw) => lower.includes(kw));

    // 3. Main Tender (NIT) hints
    const mainTenderHints = ['nit', 'tender', 'rfp', 'invitation', 'bid_document', 'biddocument'];
    const isMainTender = !isBoq && !isHighAtc && mainTenderHints.some((kw) => lower.includes(kw));

    // 4. Other supporting document hints (drawings, specs)
    const otherHints = ['drawing', 'spec', 'specification', 'catalog', 'compliance', 'datasheet', 'annexure'];
    const isExplicitOther = otherHints.some((kw) => lower.includes(kw));

    if (isHighAtc) {
        return {
            path: filePath,
            name: displayName,
            category: 'atc',
            confidence: 95.0,
            needsConfirmation: false,
            reason: 'confident',
        };
    }

    if (isBoq) {
        return {
            path: filePath,
            name: displayName,
            category: 'boq',
            confidence: 90.0,
            needsConfirmation: false,
            reason: 'confident',
        };
    }

    if (isMainTender) {
        return {
            path: filePath,
            name: displayName,
            category: 'mainTender',
            confidence: 85.0,
            needsConfirmation: false,
            reason: 'confident',
        };
    }

    if (isFallbackAtc) {
        return {
            path: filePath,
            name: displayName,
            category: 'atc',
            confidence: 60.0,
            needsConfirmation: true,
            reason: 'low_confidence',
        };
    }

    if (isExplicitOther) {
        return {
            path: filePath,
            name: displayName,
            category: 'otherDocuments',
            confidence: 80.0,
            needsConfirmation: false,
            reason: 'confident',
        };
    }

    // Unrecognized filename -> default to otherDocuments with needsConfirmation = true
    return {
        path: filePath,
        name: displayName,
        category: 'otherDocuments',
        confidence: 0.0,
        needsConfirmation: true,
        reason: 'low_confidence',
    };
}

/**
 * Classifies a document by querying the backend /classify-document endpoint
 * (which sniffs the first 5 pages of the PDF in VolksAI). Falls back seamlessly to
 * filename-based classification if network or server is unavailable.
 */
export async function classifyDocumentViaApi(filePath: string): Promise<ClassifiedDocument> {
    const meta = parseFileMeta(filePath);
    try {
        const res = await tenderInfosService.classifyDocument(filePath);
        const category = res.suggestedType === 'other' ? 'otherDocuments' : (res.suggestedType as DocumentCategory);
        return {
            path: filePath,
            name: meta.displayName,
            category,
            confidence: res.confidence,
            needsConfirmation: res.needsConfirmation,
            reason: res.reason,
            scores: res.scores,
        };
    } catch {
        return classifyDocumentFilename(filePath);
    }
}
