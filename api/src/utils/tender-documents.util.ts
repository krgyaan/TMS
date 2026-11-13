function addPath(value: unknown, result: string[], seen: Set<string>): void {
    if (typeof value !== 'string') return;

    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;

    seen.add(trimmed);
    result.push(trimmed);
}

function collectPaths(value: unknown, result: string[], seen: Set<string>): void {
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                collectPaths(JSON.parse(trimmed), result, seen);
                return;
            } catch {
                addPath(trimmed, result, seen);
                return;
            }
        }

        if (trimmed.includes(',')) {
            for (const part of trimmed.split(',')) {
                addPath(part, result, seen);
            }
            return;
        }

        addPath(trimmed, result, seen);
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            if (typeof item === 'string') {
                addPath(item, result, seen);
            } else {
                collectPaths(item, result, seen);
            }
        }
        return;
    }

    if (typeof value === 'object') {
        const documents = value as Record<string, unknown>;
        for (const key of ['mainTender', 'atc', 'boq', 'otherDocuments']) {
            collectPaths(documents[key], result, seen);
        }
    }
}

export function resolveTenderDocumentPaths(documents: unknown): string[] {
    const result: string[] = [];
    collectPaths(documents, result, new Set<string>());
    return result;
}

export function buildFileServeUrl(
    apiUrl: string | null | undefined,
    filePath: string,
): string {
    const baseUrl = (apiUrl || '').replace(/\/+$/, '');
    const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${baseUrl}/files/serve/${normalizedPath}`;
}
