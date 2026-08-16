import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Courier module contexts (courier docs, docket slip, POD).
 * Files stay at the root of uploads/courier/ (no extra nesting) —
 * storageDir is overridden to '' so the context itself becomes the folder.
 */
export const courierConfigs: Record<string, FileConfig> = {
    courier: {
        storageDir: "",
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};