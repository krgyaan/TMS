import { sql, type SQL } from 'drizzle-orm';
import { tenderExtractions } from '@db/schemas/tendering/tender-extractions.schema';

/**
 * Keys inside tender_extractions.fields that belong to features OTHER than the PDF field
 * extraction, and must survive a re-extraction / extraction save:
 *   - biddingRequirementsAnalysis: the cached bidding-requirements + annexure analysis
 *     (BiddingRequirementsService). It costs a full Sonnet pass to rebuild; wiping it made
 *     the checklist page show nothing and the next click paid for a new analysis.
 * Add a key here whenever another feature starts caching into this column.
 */
export const PRESERVED_EXTRACTION_FIELD_KEYS = ['biddingRequirementsAnalysis'] as const;

/**
 * ON CONFLICT DO UPDATE value for tender_extractions.fields: the new extraction REPLACES
 * the extraction data (so keys a newer extraction no longer produces don't linger), and each
 * preserved key is carried over from the EXISTING row. The stored copy of a preserved key
 * wins over any copy in `newFields` (a client posting back a stale snapshot must not
 * overwrite a newer analysis). A preserved key absent / JSON-null in the row adds nothing.
 */
export function extractionFieldsUpsertValue(newFields: Record<string, unknown> | null | undefined): SQL {
    const incoming: Record<string, unknown> = { ...(newFields ?? {}) };
    for (const key of PRESERVED_EXTRACTION_FIELD_KEYS) delete incoming[key];

    const carried = PRESERVED_EXTRACTION_FIELD_KEYS.map(
        (key) => sql`(CASE WHEN ${tenderExtractions.fields} ? ${key}::text
            AND ${tenderExtractions.fields} -> ${key}::text <> 'null'::jsonb
            THEN jsonb_build_object(${key}::text, ${tenderExtractions.fields} -> ${key}::text)
            ELSE '{}'::jsonb END)`,
    );
    return sql`${JSON.stringify(incoming)}::jsonb || ${sql.join(carried, sql` || `)}`;
}

/** Number of extraction-owned keys in a fields object (preserved keys excluded). */
export function countExtractionFieldKeys(fields: Record<string, unknown> | null | undefined): number {
    const preserved = new Set<string>(PRESERVED_EXTRACTION_FIELD_KEYS);
    return Object.keys(fields ?? {}).filter((k) => !preserved.has(k)).length;
}
