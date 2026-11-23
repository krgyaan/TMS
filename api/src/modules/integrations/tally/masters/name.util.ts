/**
 * Single place where Tally master names are normalised and compared.
 * Tally is documented as case-insensitive for master names; we still send the
 * canonical (caller-supplied) spelling so the books look the way finance expects.
 */
export function normalizeMasterName(name: string): string {
    return String(name ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

export function namesEqual(left: string | null | undefined, right: string | null | undefined): boolean {
    if (left === null || left === undefined || right === null || right === undefined) {
        return false;
    }

    const a = normalizeMasterName(left);
    const b = normalizeMasterName(right);

    return a.length > 0 && a.toLowerCase() === b.toLowerCase();
}

export function requireMasterName(name: string, kind: string): string {
    const normalized = normalizeMasterName(name);

    if (!normalized) {
        throw new Error(`${kind} name must not be empty`);
    }

    return normalized;
}
