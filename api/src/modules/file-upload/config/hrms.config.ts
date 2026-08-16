import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * HRMS module contexts (assets, employee documents).
 * All files stored under uploads/hrms/.
 */
export const hrmsConfigs: Record<string, FileConfig> = {
    assets: {
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "employee-documents": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};