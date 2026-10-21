// Helpers for re-pointing vendor organization references during a merge.
//
// Encodings of "list of org ids" found in the schema:
//   - CSV varchar columns (`tender_infos.rfq_to`, `rfqs.requested_organization`)
//     parsed token-wise by rfq.service.ts getVendorOrganizations().
//   - `tender_infos.oem_not_allowed` — declared text[] in Drizzle but actually
//     varchar(50) in the DB with MIXED encodings: bare `3`, CSV `4,13`,
//     pg-array literal `{"44"}`, empty `{}`. Drizzle's text[] mapper mangles
//     the bare/CSV forms (parsePgArray("4,13") -> ["","13"]), so the service
//     reads/writes this column raw and uses the loose helpers below.
//   - `tender_costing_sheets.oem_vendor_ids` jsonb number[].
//
// "0" and "1" are historical sentinel values in rfq_to (see
// bid-submissions.service.ts:443), not organization ids — never rewrite them.
// They have NO sentinel meaning in rfqs.requested_organization (token `1` is
// real org id 1; rfq.service resolves it via inArray), so callers pass
// NO_CSV_SENTINELS for that column.

const CSV_SENTINELS = new Set(["0", "1"]);

/** Sentinel set for columns whose tokens are always real org ids. */
export const NO_CSV_SENTINELS: ReadonlySet<string> = new Set<string>();

const csvContainsId = (csv: string, id: number): boolean =>
    csv
        .split(",")
        .map(token => token.trim())
        .filter(Boolean)
        .some(token => Number(token) === id);

/**
 * Replace `dropId` with `keepId` in a comma-separated org-id list, de-duplicating
 * the result. Returns the input unchanged (same reference) when no token matches,
 * so callers can cheaply detect "nothing to update".
 */
export const repointCsvIdList = (csv: string | null | undefined, dropId: number, keepId: number, sentinels: ReadonlySet<string> = CSV_SENTINELS): string | null | undefined => {
    if (!csv) return csv;

    const trimmed = csv.trim();
    if (sentinels.has(trimmed) || !csvContainsId(trimmed, dropId)) return csv;

    const seen = new Set<number>();
    const out: string[] = [];
    for (const token of trimmed.split(",")) {
        const cleaned = token.trim();
        if (!cleaned) continue;

        const id = Number(cleaned);
        if (!Number.isInteger(id)) {
            out.push(cleaned);
            continue;
        }

        const mapped = id === dropId ? keepId : id;
        if (seen.has(mapped)) continue;
        seen.add(mapped);
        out.push(String(mapped));
    }

    return out.join(",");
};

/** True when the CSV list references `id` as one of its tokens. */
export const csvIdListContains = (csv: string | null | undefined, id: number, sentinels: ReadonlySet<string> = CSV_SENTINELS): boolean =>
    !!csv && !sentinels.has(csv.trim()) && csvContainsId(csv.trim(), id);

// --- Loose id lists (tender_infos.oem_not_allowed varchar hybrid) ---

type LooseIdListFormat = "bare" | "csv" | "pg-array";

const detectLooseFormat = (raw: string): LooseIdListFormat => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return "pg-array";
    return trimmed.includes(",") ? "csv" : "bare";
};

/** Token-wise parse of any stored encoding (`3`, `4,13`, `{"44"}`, `{}`) to id tokens. */
export const parseLooseIdList = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];

    const inner = trimmed.startsWith("{") && trimmed.endsWith("}") ? trimmed.slice(1, -1) : trimmed;
    return inner
        .split(",")
        .map(token =>
            token
                .trim()
                .replace(/^"([\s\S]*)"$/, "$1")
                .trim()
        )
        .filter(Boolean);
};

/** True when the loose value references `id` in any of its encodings. */
export const looseIdListContains = (raw: string | null | undefined, id: number): boolean => parseLooseIdList(raw).some(token => Number(token) === id);

/**
 * Replace `dropId` with `keepId` in a loose id-list value, preserving the
 * original encoding (bare stays bare, CSV stays CSV, `{...}` stays `{...}`),
 * de-duplicating. Returns the input string unchanged when no token matches,
 * so callers can detect "nothing to update" by `!==`.
 */
export const repointLooseIdList = (raw: string | null | undefined, dropId: number, keepId: number): string | null | undefined => {
    if (!raw) return raw;

    const tokens = parseLooseIdList(raw);
    if (!tokens.some(token => Number(token) === dropId)) return raw;

    const seen = new Set<string>();
    const out: string[] = [];
    for (const token of tokens) {
        const id = Number(token);
        const mapped = Number.isInteger(id) && id === dropId ? String(keepId) : token;
        if (seen.has(mapped)) continue;
        seen.add(mapped);
        out.push(mapped);
    }

    const format = detectLooseFormat(raw);
    if (format === "pg-array") return `{${out.map(token => `"${token}"`).join(",")}}`;
    if (format === "csv") return out.join(",");
    return out[0] ?? "";
};

/**
 * Replace `dropId` with `keepId` inside an id array (text[] of id strings or
 * jsonb number[]), preserving element type and de-duplicating. Returns the
 * input unchanged when no element matches.
 */
export const repointIdArray = <T extends string | number>(arr: readonly T[] | null | undefined, dropId: number, keepId: number): T[] | null | undefined => {
    if (!arr) return arr;

    const seen = new Set<string>();
    const out: T[] = [];
    let changed = false;

    for (const value of arr) {
        const numeric = typeof value === "number" ? value : Number(value);
        if (Number.isInteger(numeric) && numeric === dropId) {
            changed = true;
            const mapped = (typeof value === "number" ? keepId : String(keepId)) as T;
            const key = String(mapped);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(mapped);
        } else {
            const key = String(value);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(value);
        }
    }

    return changed ? out : (arr as T[]);
};

/** True when the array references `id` (handles both number and id-string elements). */
export const idArrayContains = (arr: readonly (string | number)[] | null | undefined, id: number): boolean => !!arr && arr.some(value => Number(value) === id);
