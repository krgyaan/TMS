import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * CRM module contexts (followups).
 * All files stored under uploads/crm/.
 */
export const crmConfigs: Record<string, FileConfig> = {
    followups: {
        maxFiles: 5,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
        imageQuality: 85,
    },
    "enquiry-results": {
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "leads-quotations": {
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "site-visit": {
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
};