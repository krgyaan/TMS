import { MB, DOCS, OFFICE, type FileConfig } from './common';

/**
 * Bi-dashboard module contexts (Bank Guarantee, FDR, Demand Draft, Cheque).
 * All files stored under uploads/bi-dashboard/.
 */

/**
 * Bank Guarantee contexts nest under a dedicated feature folder so stored
 * paths read `bi-dashboard/bank-guarantee/<context>/<fileName>`; FDR/DD/
 * Cheque contexts keep the flat `uploads/bi-dashboard/<context>/` layout.
 */
const bgFile = (config: FileConfig): FileConfig => ({
    ...config,
    storageDir: 'bi-dashboard/bank-guarantee',
    includeStorageDirInPath: true,
});

export const biDashboardConfigs: Record<string, FileConfig> = {
    "bg-format-files": bgFile({
        maxFiles: 5,
        maxSizeBytes: MB(20),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx"],
    }),
    "bg-po-files": bgFile({
        maxFiles: 1,
        maxSizeBytes: MB(5),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: [".pdf", ".doc", ".docx"],
    }),
    // Bank Guarantee file contexts
    "bg-format-imran": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-prefilled-signed": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-sfms-conf": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-fdr-copy": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-ext-letter": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-docket-slip": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-stamp-covering-letter": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
    "bg-cancell-confirm": bgFile({
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    }),
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
    "cheque-stop-proof-image": {
        maxFiles: 1,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    },
};