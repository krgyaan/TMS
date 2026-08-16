import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Employee imprest module contexts (proof attachments).
 * Files stay at the root of uploads/employee-imprest/ (no extra nesting) —
 * storageDir is overridden to '' so the context itself becomes the folder.
 */
export const employeeImprestConfigs: Record<string, FileConfig> = {
    "employee-imprest": {
        storageDir: "",
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};