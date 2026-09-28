// Main tender vs ATC identity check returned by VolksAI extraction.
// Kept free of React and path aliases so it can be unit-tested with `node --test`.

export interface DocumentIdentityCheck {
    mainDocumentNumber: string | null;
    atcDocumentNumber: string | null;
    /** true = numbers agree, false = they differ, null = could not be verified. */
    match: boolean | null;
    status: 'match' | 'mismatch' | 'unverifiable' | 'no_atc' | 'same_document';
    basis: 'gem_bid_number' | 'tender_number' | null;
    mainNumbersFound: Record<string, number>;
    atcNumbersFound: Record<string, number>;
}

export interface IdentityMismatchBanner {
    mainDocumentNumber: string;
    atcDocumentNumber: string;
}

/**
 * The whole-document pairing banner is shown only for a confirmed mismatch.
 * Unverifiable checks (match === null) show nothing and never imply a match.
 */
export function getIdentityMismatchBanner(check?: DocumentIdentityCheck | null): IdentityMismatchBanner | null {
    if (!check || check.match !== false) return null;
    return {
        mainDocumentNumber: check.mainDocumentNumber ?? 'not found',
        atcDocumentNumber: check.atcDocumentNumber ?? 'not found',
    };
}
