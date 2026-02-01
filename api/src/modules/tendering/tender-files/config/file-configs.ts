export type TenderFileContext =
    | 'tender-documents'
    | 'bg-format-files'
    | 'bg-po-files'
    | 'emds'
    | 'tender-fees'
    | 'physical-docs'
    | 'rfqs'
    | 'rfq-scope-of-work'
    | 'rfq-tech-specs'
    | 'rfq-detailed-boq'
    | 'rfq-maf-format'
    | 'rfq-mii-format'
    | 'info-sheets'
    | 'costing-sheets'
    | 'bid-submitted-docs'
    | 'bid-submission-proof'
    | 'bid-final-price-ss'
    | 'tender-results'
    | 'checklists'
    | 'tq-management'
    | 'screenshot_qualified_parties'
    | 'screenshot_decrements'
    | 'final_result_screenshot'
    | 'result-screenshots'
    | 'bg-format-imran'
    | 'bg-prefilled-signed'
    | 'bg-sfms-conf'
    | 'bg-fdr-copy'
    | 'bg-ext-letter'
    | 'bg-docket-slip'
    | 'bg-stamp-covering-letter'
    | 'bg-cancell-confirm'
    | 'fdr-format-imran'
    | 'fdr-prefilled-signed'
    | 'fdr-sfms-confirmation'
    | 'fdr-request-letter-email'
    | 'fdr-docket-slip'
    | 'fdr-covering-letter'
    | 'fdr-req-receive'
    | 'dd-format-imran'
    | 'dd-prefilled-signed'
    | 'dd-request-letter-email'
    | 'dd-docket-slip'
    | 'dd-covering-letter'
    | 'cheque-format-imran'
    | 'cheque-prefilled-signed'
    | 'cheque-images'
    | 'cheque-docket-slip'
    | 'cheque-covering-letter'
    | 'cheque-cancelled-image';

export interface FileConfig {
    maxFiles: number;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
    compressImages: boolean;
    imageQuality: number;
    compressPdf: boolean;
    pdfQuality: number;
}

const MB = (n: number) => n * 1024 * 1024;

const MIME = {
    PDF: 'application/pdf',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    JPG: 'image/jpeg',
    PNG: 'image/png',
    WEBP: 'image/webp',
    ZIP: 'application/zip',
    RAR: 'application/x-rar-compressed',
};

const IMAGES = [MIME.JPG, MIME.PNG, MIME.WEBP];
const DOCS = [MIME.PDF, ...IMAGES];
const OFFICE = [MIME.DOC, MIME.DOCX, MIME.XLS, MIME.XLSX];
const ARCHIVES = [MIME.ZIP, MIME.RAR];

export const FILE_CONFIGS: Record<TenderFileContext, FileConfig> = {
    'tender-documents': {
        maxFiles: 5,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-format-files': {
        maxFiles: 5,
        maxSizeBytes: MB(20),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.doc', '.docx'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-po-files': {
        maxFiles: 1,
        maxSizeBytes: MB(5),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.doc', '.docx'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'emds': {
        maxFiles: 1,
        maxSizeBytes: MB(5),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'tender-fees': {
        maxFiles: 1,
        maxSizeBytes: MB(5),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'physical-docs': {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'rfqs': {
        maxFiles: 10,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'rfq-scope-of-work': {
        maxFiles: 3,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'rfq-tech-specs': {
        maxFiles: 3,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'rfq-detailed-boq': {
        maxFiles: 3,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'rfq-maf-format': {
        maxFiles: 3,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'rfq-mii-format': {
        maxFiles: 3,
        maxSizeBytes: MB(25),
        allowedMimeTypes: [...DOCS, ...OFFICE, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'info-sheets': {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'costing-sheets': {
        maxFiles: 1,
        maxSizeBytes: MB(15),
        allowedMimeTypes: [MIME.PDF, MIME.XLS, MIME.XLSX],
        allowedExtensions: ['.pdf', '.xls', '.xlsx'],
        compressImages: false,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bid-submitted-docs': {
        maxFiles: 3,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bid-submission-proof': {
        maxFiles: 3,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bid-final-price-ss': {
        maxFiles: 3,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'tender-results': {
        maxFiles: 1,
        maxSizeBytes: MB(5),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'checklists': {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'tq-management': {
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, MIME.DOC, MIME.DOCX],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'screenshot_qualified_parties': {
        maxFiles: 2,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'screenshot_decrements': {
        maxFiles: 2,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'final_result_screenshot': {
        maxFiles: 2,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'result-screenshots': {
        maxFiles: 2,
        maxSizeBytes: MB(8),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    // Bank Guarantee file contexts
    'bg-format-imran': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-prefilled-signed': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-sfms-conf': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-fdr-copy': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-ext-letter': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-docket-slip': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-stamp-covering-letter': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'bg-cancell-confirm': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    // FDR file contexts
    'fdr-format-imran': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'fdr-prefilled-signed': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'fdr-sfms-confirmation': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'fdr-request-letter-email': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'fdr-docket-slip': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'fdr-covering-letter': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'fdr-req-receive': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    // Demand Draft file contexts
    'dd-format-imran': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'dd-prefilled-signed': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'dd-request-letter-email': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'dd-docket-slip': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'dd-covering-letter': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    // Cheque file contexts
    'cheque-format-imran': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'cheque-prefilled-signed': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'cheque-images': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'cheque-docket-slip': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'cheque-covering-letter': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
    'cheque-cancelled-image': {
        maxFiles: 2,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
        compressImages: true,
        imageQuality: 80,
        compressPdf: true,
        pdfQuality: 80,
    },
};

export function getFileConfig(context: TenderFileContext): FileConfig {
    const config = FILE_CONFIGS[context];
    if (!config) {
        throw new Error(`Unknown file context: ${context}`);
    }
    return config;
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

export function isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
}
