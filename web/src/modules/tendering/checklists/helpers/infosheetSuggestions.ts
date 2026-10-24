/**
 * Helper to extract read-only document suggestions from stored infosheet extractions
 * (requiredDocuments and doc1-doc9 in tender_extractions.fields).
 *
 * Requirements:
 * - Read-only; zero Claude calls.
 * - Labelled "from infosheet extraction (unverified)".
 * - Preselect nothing.
 * - Shows source (rule/located) from stored record.
 */

export interface InfosheetSuggestion {
    documentName: string;
    fieldKey: string;
    label: string;
    sourceType: 'rule' | 'located';
    sourceDisplay: string;
    rawSource?: any;
}

const EMPTY_VALUES = new Set(['na', 'n/a', 'none', 'nil', 'not found', 'null', 'undefined', '']);

function cleanDocName(val: unknown): string | null {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (EMPTY_VALUES.has(trimmed.toLowerCase())) return null;
    return trimmed;
}

function resolveSource(fieldObj: any): { sourceType: 'rule' | 'located'; sourceDisplay: string } {
    if (!fieldObj || typeof fieldObj !== 'object') {
        return { sourceType: 'rule', sourceDisplay: 'rule' };
    }

    const sources = fieldObj.sources;
    if (sources && typeof sources === 'object') {
        if (sources.located === true) {
            if (sources.main_tender && typeof sources.main_tender === 'object' && sources.main_tender.page != null) {
                return { sourceType: 'located', sourceDisplay: `Main p. ${sources.main_tender.page}` };
            }
            if (sources.atc && typeof sources.atc === 'object' && sources.atc.page != null) {
                return { sourceType: 'located', sourceDisplay: `ATC p. ${sources.atc.page}` };
            }
            return { sourceType: 'located', sourceDisplay: 'located' };
        }
    }

    const source = typeof fieldObj.source === 'string' ? fieldObj.source : null;
    if (source) {
        return { sourceType: 'rule', sourceDisplay: `rule (${source})` };
    }

    return { sourceType: 'rule', sourceDisplay: 'rule' };
}

export function extractInfosheetSuggestions(
    fields: Record<string, any> | null | undefined
): InfosheetSuggestion[] {
    if (!fields || typeof fields !== 'object') return [];

    const suggestions: InfosheetSuggestion[] = [];
    const seenNames = new Set<string>();

    // 1. Process doc1 through doc9
    for (let i = 1; i <= 9; i++) {
        const key = `doc${i}`;
        const fieldVal = fields[key];
        if (!fieldVal) continue;

        const rawValue = typeof fieldVal === 'object' && fieldVal !== null && 'value' in fieldVal
            ? fieldVal.value
            : fieldVal;

        const docName = cleanDocName(rawValue);
        if (docName && !seenNames.has(docName.toLowerCase())) {
            seenNames.add(docName.toLowerCase());
            const { sourceType, sourceDisplay } = resolveSource(fieldVal);
            suggestions.push({
                documentName: docName,
                fieldKey: key,
                label: 'from infosheet extraction (unverified)',
                sourceType,
                sourceDisplay,
                rawSource: fieldVal,
            });
        }
    }

    // 2. Process requiredDocuments (array or comma-separated string)
    const reqDocsField = fields.requiredDocuments;
    if (reqDocsField) {
        const rawValue = typeof reqDocsField === 'object' && reqDocsField !== null && 'value' in reqDocsField
            ? reqDocsField.value
            : reqDocsField;

        const list: string[] = Array.isArray(rawValue)
            ? rawValue
            : typeof rawValue === 'string'
            ? rawValue.split(',').map((s) => s.trim())
            : [];

        const { sourceType, sourceDisplay } = resolveSource(reqDocsField);

        for (const item of list) {
            const docName = cleanDocName(item);
            if (docName && !seenNames.has(docName.toLowerCase())) {
                seenNames.add(docName.toLowerCase());
                suggestions.push({
                    documentName: docName,
                    fieldKey: 'requiredDocuments',
                    label: 'from infosheet extraction (unverified)',
                    sourceType,
                    sourceDisplay,
                    rawSource: reqDocsField,
                });
            }
        }
    }

    return suggestions;
}
