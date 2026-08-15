export interface FileConfig {
    maxFiles: number;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
    /**
     * Compression rules. Defaults (see DEFAULT_COMPRESSION below) are applied
     * to every context at merge time in config/index.ts; set any of these per
     * entry only to opt out / tune a specific context.
     */
    compressImages?: boolean;
    imageQuality?: number;
    compressPdf?: boolean;
    pdfQuality?: number;
    /**
     * Subdirectory of uploads/ where this context's files are stored
     * (e.g. 'tendering', 'bi-dashboard', 'operations'). Defaults to 'tendering'.
     * Set per-module at merge time in config/index.ts; individual contexts can
     * still override it here if needed.
     */
    storageDir?: string;
}

/**
 * Default compression rules every upload context follows unless it explicitly
 * overrides them per entry.
 */
export const DEFAULT_COMPRESSION = {
    compressImages: true,
    imageQuality: 80,
    compressPdf: true,
    pdfQuality: 80,
} as const;

/**
 * FileConfig after merge-time defaults have been applied — compression fields
 * are guaranteed present. This is what the service consumes.
 */
export type ResolvedFileConfig = Omit<FileConfig, 'compressImages' | 'imageQuality' | 'compressPdf' | 'pdfQuality'> & {
    compressImages: boolean;
    imageQuality: number;
    compressPdf: boolean;
    pdfQuality: number;
};

/**
 * Default storage subdirectory of uploads/ for modules that don't specify one.
 * Kept as 'tendering' so all existing stored file paths keep resolving to the
 * same on-disk location.
 */
export const DEFAULT_STORAGE_DIR = 'tendering';

export const MB = (n: number) => n * 1024 * 1024;

export const MIME = {
    PDF: "application/pdf",
    DOC: "application/msword",
    DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    XLS: "application/vnd.ms-excel",
    XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    JPG: "image/jpeg",
    PNG: "image/png",
    WEBP: "image/webp",
    ZIP: "application/zip",
    RAR: "application/x-rar-compressed",
    MP4: "video/mp4",
    MOV: "video/quicktime",
    WEBM: "video/webm",
    MKV: "video/x-matroska",
};

export const IMAGES = [MIME.JPG, MIME.PNG, MIME.WEBP];
export const DOCS = [MIME.PDF, ...IMAGES];
export const OFFICE = [MIME.DOC, MIME.DOCX, MIME.XLS, MIME.XLSX];
export const ARCHIVES = [MIME.ZIP, MIME.RAR];
export const VIDEOS = [MIME.MP4, MIME.MOV, MIME.WEBM, MIME.MKV];

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/");
}

export function isPdf(mimeType: string): boolean {
    return mimeType === "application/pdf";
}