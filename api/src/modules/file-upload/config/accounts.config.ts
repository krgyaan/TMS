import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Accounts module contexts (loan advances / bank documents).
 * All files stored under uploads/accounts/.
 */
export const accountsConfigs: Record<string, FileConfig> = {
    "bankLoanSchedule": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "sanctionLetter": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "tdsDocument": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "bankNoc": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    },
    checklist: {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "follow-ups": {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
        imageQuality: 85,
    },
};