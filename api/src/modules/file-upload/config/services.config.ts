import { MB, DOCS, OFFICE, VIDEOS, type FileConfig } from './common';

/**
 * Services module contexts (AMC, customer attachments).
 * All files stored under uploads/services/.
 */
export const servicesConfigs: Record<string, FileConfig> = {
    "amc-po": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
    },
    "amc-service-report": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
    },
    "amc-invoices": {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "amc-receipts": {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "amc-service-reports": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
    },
    "customer-attachments": {
        maxFiles: 1,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...VIDEOS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".mp4", ".mov", ".webm", ".mkv"],
    },
};