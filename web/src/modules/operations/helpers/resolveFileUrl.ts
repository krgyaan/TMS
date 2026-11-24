import { fileUploadService } from "@/services/api/file-upload.service";

/**
 * Storage directories that may prefix a legacy stored path
 * (e.g. `operations/wo-draft/file.pdf` or `uploads/tendering/wo-draft/file.pdf`).
 * Only the generic upload route supports `<context>/<file>`, so these prefixes
 * must be removed before building the serve URL.
 */
const STRIPPABLE_STORAGE_DIRS = new Set(["operations", "tendering"]);

/**
 * Builds a servable URL for a stored attachment path without assuming its
 * upload context. Absolute URLs are returned untouched, bare filenames are
 * resolved against `defaultContext`, and legacy storage-dir prefixes are
 * normalized away.
 */
export function resolveFileUrl(
    filePath: string | null | undefined,
    defaultContext?: string,
): string {
    if (!filePath) return "";

    const trimmed = filePath.trim();
    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const segments = trimmed
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/^uploads\//i, "")
        .split("/")
        .filter(Boolean);

    if (segments.length === 0) return "";

    if (segments.length > 1 && STRIPPABLE_STORAGE_DIRS.has(segments[0])) {
        segments.shift();
    }

    if (segments.length === 1 && defaultContext) {
        segments.unshift(defaultContext);
    }

    return fileUploadService.getFileUrl(segments.join("/"));
}
