import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Master module contexts (circulars).
 * All files stored under uploads/master/.
 */
export const masterConfigs: Record<string, FileConfig> = {
    circulars: {
        maxFiles: 1,
        maxSizeBytes: MB(20),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};