const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toIstWallClock(date: Date): Date {
    return new Date(date.getTime() + IST_OFFSET_MS);
}

export function getIstDateKey(date: Date = new Date()): string {
    const ist = toIstWallClock(date);
    const year = ist.getUTCFullYear();
    const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const day = String(ist.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getIstTimeKey(date: Date = new Date()): string {
    const ist = toIstWallClock(date);
    const hours = String(ist.getUTCHours()).padStart(2, "0");
    const minutes = String(ist.getUTCMinutes()).padStart(2, "0");
    return `${hours}${minutes}`;
}

export function getIstDayBounds(date: Date = new Date()): { start: Date; end: Date } {
    const ist = toIstWallClock(date);
    const start = new Date(
        Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS,
    );
    return {
        start,
        end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
}
