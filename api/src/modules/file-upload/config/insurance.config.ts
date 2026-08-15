import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Insurance module contexts.
 * All files stored under uploads/insurance/.
 */
export const insuranceConfigs: Record<string, FileConfig> = {
    insurances: {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};