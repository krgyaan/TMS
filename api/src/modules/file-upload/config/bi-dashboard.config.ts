import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Bi-dashboard module contexts (Bank Guarantee, FDR, Demand Draft, Cheque).
 * All files stored under uploads/bi-dashboard/.
 */
export const biDashboardConfigs: Record<string, FileConfig> = {
    "bg-format-files": {
        maxFiles: 5,
        maxSizeBytes: MB(20),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx"],
    },
    "bg-po-files": {
        maxFiles: 1,
        maxSizeBytes: MB(5),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx"],
    },
    // Bank Guarantee file contexts
    "bg-format-imran": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-prefilled-signed": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-sfms-conf": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-fdr-copy": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-ext-letter": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-docket-slip": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-stamp-covering-letter": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "bg-cancell-confirm": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    // FDR file contexts
    "fdr-format-imran": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "fdr-prefilled-signed": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "fdr-sfms-confirmation": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "fdr-request-letter-email": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "fdr-docket-slip": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "fdr-covering-letter": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "fdr-req-receive": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    // Demand Draft file contexts
    "dd-format-imran": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "dd-prefilled-signed": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "dd-request-letter-email": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "dd-docket-slip": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "dd-covering-letter": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    // Cheque file contexts
    "cheque-format-imran": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-prefilled-signed": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-images": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-docket-slip": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-covering-letter": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-cancelled-image": {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-receiving-handed-over": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
    "cheque-positive-pay-confirmation": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
};