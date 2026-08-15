import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Shared module contexts (PQR, finance documents).
 * All files stored under uploads/shared/.
 */
export const sharedConfigs: Record<string, FileConfig> = {
    "pqr-po": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "pqr-sap-gem-po": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "pqr-completion": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "pqr-performance-certificate": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "finance-document": {
        maxFiles: 5,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};