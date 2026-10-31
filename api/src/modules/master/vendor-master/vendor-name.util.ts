/**
 * Vendor-organization names share a uniqueness rule across every write path
 * (vendor master, PO parties, VWO parties). The DB unique index is
 * `lower(btrim(name))`, so names are matched case- and edge-whitespace
 * insensitively.
 *
 * Stored names are also formatted: Title Case, with a leading acronym kept
 * as typed (for example `ABC ENTERPRISES PVT LTD` -> `ABC Pvt Ltd`).
 */

const SUFFIX_MAP: Record<string, string> = {
    private: "Pvt",
    pvt: "Pvt",
    limited: "Ltd",
    ltd: "Ltd",
};

const isAcronym = (token: string): boolean => {
    const core = token.replace(/[^A-Za-z0-9]/g, "");
    return core.length >= 2 && core === core.toUpperCase() && /[A-Z]/.test(core);
};

const formatToken = (token: string, isFirstWord: boolean): string => {
    if (!token) return token;

    // A vendor name that starts with an acronym keeps it exactly as typed.
    if (isFirstWord && isAcronym(token)) return token;

    // Lowercase, then capitalise the start and letters after -, ', ’, /.
    const titleCased = token.toLowerCase().replace(/(^|[-'’/])([a-z])/g, (_, prefix: string, char: string) => prefix + char.toUpperCase());

    // Normalise legal suffixes, tolerating a trailing dot.
    const match = titleCased.match(/^([A-Za-z]+)(\.?)$/);
    if (match) {
        const mapped = SUFFIX_MAP[match[1].toLowerCase()];
        if (mapped) return mapped;
    }

    return titleCased;
};

/**
 * Formats a vendor organization name for storage/display:
 * Title Case, leading acronym preserved, `Private` -> `Pvt`, `Limited` -> `Ltd`.
 * Inner spacing is preserved.
 */
export const formatVendorName = (name: string | null | undefined): string => {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return "";

    let wordIndex = 0;
    return trimmed
        .split(/(\s+)/)
        .map(part => {
            if (!part || /^\s+$/.test(part)) return part;
            const formatted = formatToken(part, wordIndex === 0);
            wordIndex += 1;
            return formatted;
        })
        .join("");
};

/**
 * Normalizes a vendor name for persistence and comparison. Persisted names are
 * formatted (see `formatVendorName`); uniqueness checks still lowercase the
 * result, so matching stays case-insensitive.
 */
export const normalizeVendorName = (name: string | null | undefined): string => formatVendorName(name);

/**
 * True when a Postgres unique-violation (23505) bubbled up, including when
 * drizzle nests the driver error under `cause`.
 */
export const isUniqueViolation = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const e = error as { code?: unknown; cause?: { code?: unknown } };
    return e.code === "23505" || e.cause?.code === "23505";
};
