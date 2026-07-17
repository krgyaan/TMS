export function getShortId(fullId?: string | null): string {
    if (!fullId) return "-";
    const parts = fullId.split("/");
    return parts[parts.length - 1] || fullId;
}
