export interface FileMeta {
    userId?: number;
    timestamp?: number;
    displayName: string;
}

/**
 * Parse an uploaded file's stored path/URL to recover the uploader's user id and
 * upload time. AMC-context files are stored as `{userId}_{ddmmyy}_{hhmmss}_{name}`
 * (e.g. `100_080826_031045_report.pdf`). Older AMC files may use
 * `{userId}_{epochMs}_{name}`, and legacy files (no prefix) fall back to showing
 * the raw filename.
 */
export function parseFileMeta(path: string): FileMeta {
    const fileName = path.split(/[/\\]/).pop() || path;

    const amcMatch = /^(\d+)_(\d{6})_(\d{6})_(.+)$/.exec(fileName);
    if (amcMatch) {
        const day = Number(amcMatch[2].slice(0, 2));
        const month = Number(amcMatch[2].slice(2, 4));
        const year = Number(amcMatch[2].slice(4, 6));
        const hour = Number(amcMatch[3].slice(0, 2));
        const minute = Number(amcMatch[3].slice(2, 4));
        const second = Number(amcMatch[3].slice(4, 6));
        if (
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31 &&
            hour >= 0 && hour <= 23 &&
            minute >= 0 && minute <= 59 &&
            second >= 0 && second <= 59
        ) {
            const date = new Date(2000 + year, month - 1, day, hour, minute, second);
            return {
                userId: Number(amcMatch[1]),
                timestamp: date.getTime(),
                displayName: amcMatch[4],
            };
        }
    }

    const epochMatch = /^(\d+)_(\d+)_(.+)$/.exec(fileName);
    if (epochMatch) {
        const ts = Number(epochMatch[2]);
        if (ts >= 1000000000) {
            return { userId: Number(epochMatch[1]), timestamp: ts, displayName: epochMatch[3] };
        }
    }

    return { displayName: fileName };
}

export function formatUploadedAt(timestamp: number): string {
    return new Date(timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
