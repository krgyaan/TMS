import { posix } from "path";
import { FILE_CONFIGS, getStorageDir, type FileContext } from "./config";

const STORAGE_DIRS = new Set(
    Object.values(FILE_CONFIGS)
        .map(config => config.storageDir)
        .filter((dir): dir is string => Boolean(dir))
);

const isKnownContext = (value: string): value is FileContext =>
    Object.prototype.hasOwnProperty.call(FILE_CONFIGS, value);

/**
 * Convert a stored file reference into a path relative to the uploads root.
 *
 * Handles:
 *  - `<context>/<file>` (e.g. `follow-ups/x.pdf`) → `<storageDir>/<context>/<file>`
 *  - bare `<file>` → uses `defaultContext`
 *  - paths that already include a storage/module dir (e.g. `accounts/x.pdf`,
 *    `bi-dashboard/bank-guarantee/...`) → returned unchanged.
 */
export function resolveUploadRelativePath(storedPath: string, defaultContext: FileContext = "follow-ups"): string {
    const normalized = storedPath.replace(/\\/g, "/").replace(/^\/+/, "");

    if (!normalized) {
        throw new Error("Empty file path");
    }

    const segments = normalized.split("/");
    if (segments.includes("..")) {
        throw new Error(`Invalid file path: ${storedPath}`);
    }

    const first = segments[0];

    if (!isKnownContext(first)) {
        if (segments.length > 1 || STORAGE_DIRS.has(first)) {
            return normalized;
        }

        const contextDir = getStorageDir(defaultContext);
        return contextDir
            ? posix.join(contextDir, defaultContext, normalized)
            : posix.join(defaultContext, normalized);
    }

    const storageDir = getStorageDir(first);
    return storageDir && !normalized.startsWith(`${storageDir}/`)
        ? posix.join(storageDir, normalized)
        : normalized;
}
