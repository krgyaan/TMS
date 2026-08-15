import {
    Injectable,
    BadRequestException,
    OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { AppLogger } from '@/logger/app-logger.service';
import { getFileConfig, getStorageDir, formatBytes, isImage, type FileContext, type FileConfig, type ResolvedFileConfig, FILE_CONFIGS } from './config';

export interface UploadedFile {
    originalName: string;
    fileName: string;
    path: string;
    fullPath: string;
    mimeType: string;
    size: number;
    sizeFormatted: string;
}

export interface UploadResult {
    success: boolean;
    files: UploadedFile[];
    errors: Array<{ fileName: string; error: string }>;
}

@Injectable()
export class FileUploadService implements OnModuleInit {
    private readonly logger;
    private readonly uploadsRoot: string;

    constructor(private readonly appLogger: AppLogger) {
        this.uploadsRoot = path.join(process.cwd(), 'uploads');
        this.logger = this.appLogger.withContext(FileUploadService.name);
    }

    async onModuleInit() {
        await this.ensureDirectoriesExist();
    }

    /**
     * Base directory for a context's files, resolved from the context's
     * configured storageDir (defaults to 'tendering').
     */
    private getBasePath(context: FileContext): string {
        return path.join(this.uploadsRoot, getStorageDir(context));
    }

    /**
     * Create all required directories on startup
     */
    private async ensureDirectoriesExist(): Promise<void> {
        const contexts = Object.keys(FILE_CONFIGS) as FileContext[];
        for (const context of contexts) {
            const dir = path.join(this.getBasePath(context), context);
            await fs.mkdir(dir, { recursive: true });
        }
        this.logger.log('Upload directories initialized');
    }

    /**
     * Derive the context from a stored relative path (`{context}/{fileName}`)
     */
    private getContextFromPath(filePath: string): FileContext {
        const context = filePath.split('/')[0];
        if (!(context in FILE_CONFIGS)) {
            throw new BadRequestException(`Unknown file context: ${context}`);
        }
        return context as FileContext;
    }

    /**
     * Get config for frontend
     */
    getConfig(context: FileContext) {
        const config = getFileConfig(context);
        return {
            context,
            maxFiles: config.maxFiles,
            maxSizeBytes: config.maxSizeBytes,
            maxSizeFormatted: formatBytes(config.maxSizeBytes),
            allowedExtensions: config.allowedExtensions,
             allowedMimeTypes: config.allowedMimeTypes,
            storageDir: getStorageDir(context),
        };
    }

    /**
     * Get all configs
     */
    getAllConfigs() {
        return Object.keys(FILE_CONFIGS).map((ctx) =>
            this.getConfig(ctx as FileContext),
        );
    }

    /**
     * Upload files
     * @param files - Multer files
     * @param context - Which module (emds, rfqs, etc.)
     * @param userId - Authenticated user performing the upload
     * @returns Array of uploaded file paths
     */
    async upload(
        files: Express.Multer.File[],
        context: FileContext,
        userId: number,
    ): Promise<UploadResult> {
        const config = getFileConfig(context);
        const result: UploadResult = {
            success: true,
            files: [],
            errors: [],
        };

        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        if (files.length > config.maxFiles) {
            throw new BadRequestException(
                `Maximum ${config.maxFiles} file(s) allowed for ${context}`,
            );
        }

        // Log upload start
        this.logger.log(
            `Upload started: ${files.length} file(s) for context '${context}'`,
        );

        for (const file of files) {
            try {
                // Log file being processed
                this.logger.log(
                    `Processing file: ${file.originalname} (${formatBytes(file.size)}, ${file.mimetype})`,
                );

                // Validate
                const error = this.validate(file, config);
                if (error) {
                    this.logger.warn(`Validation failed for ${file.originalname}: ${error}`);
                    result.errors.push({ fileName: file.originalname, error });
                    result.success = false;
                    continue;
                }

                // Process and save
                const uploaded = await this.processAndSave(file, context, config, userId);
                result.files.push(uploaded);

                // Log successful upload with details
                this.logger.log(
                    `File uploaded successfully: ${uploaded.originalName} → ${uploaded.fileName} (${uploaded.sizeFormatted})`,
                );
            } catch (err) {
                this.logger.error(`Failed to upload: ${file.originalname}`, err);
                result.errors.push({
                    fileName: file.originalname,
                    error: 'Upload failed',
                });
                result.success = false;
            }
        }

        // Log upload completion summary
        this.logger.log(
            `Upload completed: ${result.files.length} successful, ${result.errors.length} failed`,
        );

        return result;
    }

    /**
     * Validate file against config
     */
    private validate(file: Express.Multer.File, config: FileConfig): string | null {
        // Check size
        if (file.size > config.maxSizeBytes) {
            return `File size (${formatBytes(file.size)}) exceeds limit (${formatBytes(config.maxSizeBytes)})`;
        }

        // Check MIME type
        if (!config.allowedMimeTypes.includes(file.mimetype)) {
            return `File type '${file.mimetype}' not allowed`;
        }

        // Check extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!config.allowedExtensions.includes(ext)) {
            return `Extension '${ext}' not allowed`;
        }

        return null;
    }

    /**
     * Process (compress if image) and save file
     */
    private async processAndSave(
        file: Express.Multer.File,
        context: FileContext,
        config: ResolvedFileConfig,
        userId: number,
    ): Promise<UploadedFile> {
        // Generate unique filename. AMC contexts use a readable timestamp so the
        // uploader and time can be recovered from the stored name:
        //   amc: {userId}_{ddmmyy}_{hhmmss}_{sanitizedName}.ext  (e.g. 100_080826_031045_report.pdf)
        //   other contexts: {epochMs}_{sanitizedName}.ext
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 50);
        const isAmc = context.startsWith('amc-');
        const pad = (n: number) => String(n).padStart(2, '0');
        const fileName = isAmc
            ? (() => {
                  const now = new Date();
                  const datePart = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}`;
                  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                  return `${userId}_${datePart}_${timePart}_${baseName}${ext}`;
              })()
            : `${timestamp}_${baseName}${ext}`;

        const relativePath = path.join(context, fileName).replace(/\\/g, '/');
        const absolutePath = path.join(this.getBasePath(context), relativePath);

        let buffer = file.buffer;
        let finalSize = file.size;
        const originalSize = file.size;

        // Compress PDFs if enabled
        if (config.compressPdf && file.mimetype === 'application/pdf') {
            try {
                this.logger.log(`Compressing PDF: ${file.originalname} (${formatBytes(originalSize)})`);
                buffer = await this.compressPdf(file.buffer, config.pdfQuality);
                finalSize = buffer.length;
                const compressionRatio = ((originalSize - finalSize) / originalSize * 100).toFixed(1);
                this.logger.log(
                    `PDF compressed: ${file.originalname} - ${formatBytes(originalSize)} → ${formatBytes(finalSize)} (${compressionRatio}% reduction)`,
                );
            } catch (err) {
                this.logger.warn(`PDF compression failed for ${file.originalname}, using original: ${err}`);
                buffer = file.buffer;
                finalSize = file.size;
            }
        }

        // Compress images if enabled
        if (config.compressImages && isImage(file.mimetype)) {
            try {
                this.logger.log(`Compressing image: ${file.originalname} (${formatBytes(originalSize)})`);
                buffer = await this.compressImage(file.buffer, file.mimetype, config.imageQuality);
                finalSize = buffer.length;
                const compressionRatio = ((originalSize - finalSize) / originalSize * 100).toFixed(1);
                this.logger.log(
                    `Image compressed: ${file.originalname} - ${formatBytes(originalSize)} → ${formatBytes(finalSize)} (${compressionRatio}% reduction)`,
                );
            } catch (err) {
                this.logger.warn(`Image compression failed for ${file.originalname}, using original: ${err}`);
                buffer = file.buffer;
                finalSize = file.size;
            }
        }

        // Write to disk
        await fs.writeFile(absolutePath, buffer);

        return {
            originalName: file.originalname,
            fileName,
            path: relativePath,
            fullPath: absolutePath,
            mimeType: file.mimetype,
            size: finalSize,
            sizeFormatted: formatBytes(finalSize),
        };
    }

    /**
     * Compress image using sharp
     */
    private async compressImage(
        buffer: Buffer,
        mimeType: string,
        quality: number,
    ): Promise<Buffer> {
        let sharpInstance = sharp(buffer);

        // Auto-rotate based on EXIF
        sharpInstance = sharpInstance.rotate();

        // Resize if too large (max 2000px width/height)
        sharpInstance = sharpInstance.resize(2000, 2000, {
            fit: 'inside',
            withoutEnlargement: true,
        });

        // Compress based on type
        if (mimeType === 'image/jpeg') {
            return sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
        } else if (mimeType === 'image/png') {
            return sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer();
        } else if (mimeType === 'image/webp') {
            return sharpInstance.webp({ quality }).toBuffer();
        }

        // Return original for unsupported types
        return buffer;
    }

    /**
     * Compress PDF using pdf-lib
     * Optimizes PDF by removing unused objects and compressing streams
     */
    private async compressPdf(buffer: Buffer, quality: number): Promise<Buffer> {
        try {
            // Load the PDF document
            const pdfDoc = await PDFDocument.load(buffer);

            // Save the PDF with compression enabled
            // pdf-lib automatically compresses streams and removes unused objects
            const compressedPdfBytes = await pdfDoc.save({
                useObjectStreams: true, // Enable object streams for better compression
                addDefaultPage: false, // Don't add default page if not needed
            });

            return Buffer.from(compressedPdfBytes);
        } catch (error) {
            this.logger.error(`PDF compression error: ${error}`);
            throw error;
        }
    }

    /**
     * Delete a file by path
     */
    async delete(filePath: string): Promise<void> {
        const absolutePath = path.join(this.getBasePath(this.getContextFromPath(filePath)), filePath);
        try {
            await fs.unlink(absolutePath);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw err;
            }
            // File doesn't exist, ignore
        }
    }

    /**
     * Check if file exists
     */
    async exists(filePath: string): Promise<boolean> {
        const absolutePath = path.join(this.getBasePath(this.getContextFromPath(filePath)), filePath);
        try {
            await fs.access(absolutePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get absolute path for serving
     */
    getAbsolutePath(filePath: string): string {
        return path.join(this.getBasePath(this.getContextFromPath(filePath)), filePath);
    }
}