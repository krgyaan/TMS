import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Operations module contexts (work orders, purchase orders, contracts, payments).
 * All files stored under uploads/operations/.
 */
export const operationsConfigs: Record<string, FileConfig> = {
    "mcaClosure": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "wo-draft": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    },
    "wo-signed-copy": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "final-wo": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "detailed-wo": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "kickoff-mom": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "contract-agreement": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "payment-proof": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
        imageQuality: 100,
        compressPdf: false,
        pdfQuality: 100,
    },
    "wo-documents": {
        maxFiles: 1,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
};