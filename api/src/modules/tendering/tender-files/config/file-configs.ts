export type TenderFileContext =
    | 'tender-documents'
    | 'emds'
    | 'tender-fees'
    | 'physical-docs'
    | 'rfqs'
    | 'info-sheets'
    | 'costing-sheets'
    | 'bid-submissions'
    | 'tender-results'
    | 'checklists'
    | 'tq-management'
    | 'reverse-auctions';

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
        maxFiles: 10,
        maxSizeBytes: MB(10),
        allowedMimeTypes: [...DOCS, ...OFFICE],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
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
    'bid-submissions': {
        maxFiles: 10,
        maxSizeBytes: MB(50),
        allowedMimeTypes: [MIME.PDF, ...ARCHIVES],
        allowedExtensions: ['.pdf', '.zip', '.rar'],
        compressImages: false,
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
    'reverse-auctions': {
        maxFiles: 1,
        maxSizeBytes: MB(5),
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
