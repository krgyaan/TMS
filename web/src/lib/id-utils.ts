// VE/SAIL_Jharkhand_Space_Maker/2627/PR0355
// MR/2627/0245

export function getShortId(fullId?: string | null): string {
    if (!fullId) return "-";
    const parts = fullId.split("/");
    return parts[parts.length - 1] || fullId;
}

export function referenceName(fullId?: string | null): string {
    if (!fullId) return "-";
    const parts = fullId.split("/");
    const initials = parts[0];

    if (initials == 'VE') {
        return "Project Payment"
    } else if (initials == 'MR') {
        return "Maker Request"
    } else {
        return fullId
    }
}
