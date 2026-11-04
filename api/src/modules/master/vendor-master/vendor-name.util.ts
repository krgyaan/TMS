/**
 * Vendor-organization names share a uniqueness rule across every write path
 * (vendor master, PO parties, VWO parties). The DB unique index is
 * `lower(btrim(name))`, so names are matched case- and edge-whitespace
 * insensitively. Keep the app-side normalization in lockstep with that
 * expression: trim only, preserving inner spacing and case for display.
 */
export const normalizeVendorName = (name: string | null | undefined): string => (name ?? "").trim();

/**
 * True when a Postgres unique-violation (23505) bubbled up, including when
 * drizzle nests the driver error under `cause`.
 */
export const isUniqueViolation = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const e = error as { code?: unknown; cause?: { code?: unknown } };
    return e.code === "23505" || e.cause?.code === "23505";
};
