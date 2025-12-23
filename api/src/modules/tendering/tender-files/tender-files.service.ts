import {
    Injectable,
    BadRequestException,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { getFileConfig, formatBytes, isImage, type TenderFileContext, type FileConfig, FILE_CONFIGS, isPdf } from './config/file-configs';

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
export class TenderFilesService implements OnModuleInit {
    private readonly logger = new Logger(TenderFilesService.name);
    private readonly baseUploadPath: string;

    constructor() {
        this.baseUploadPath = path.join(process.cwd(), 'uploads', 'tendering');
    }

    async onModuleInit() {
        await this.ensureDirectoriesExist();
    }

    /**
     * Create all required directories on startup
     */
    private async ensureDirectoriesExist(): Promise<void> {
        const contexts = Object.keys(FILE_CONFIGS) as TenderFileContext[];
        for (const context of contexts) {
            const dir = path.join(this.baseUploadPath, context);
            await fs.mkdir(dir, { recursive: true });
        }
        this.logger.log('Upload directories initialized');
    }

    /**
     * Get config for frontend
     */
    getConfig(context: TenderFileContext) {
        const config = getFileConfig(context);
        return {
            context,
            maxFiles: config.maxFiles,
            maxSizeBytes: config.maxSizeBytes,
            maxSizeFormatted: formatBytes(config.maxSizeBytes),
            allowedExtensions: config.allowedExtensions,
        };
    }

    /**
     * Get all configs
     */
    getAllConfigs() {
        return Object.keys(FILE_CONFIGS).map((ctx) =>
            this.getConfig(ctx as TenderFileContext),
        );
    }

    /**
     * Upload files
     * @param files - Multer files
     * @param context - Which module (emds, rfqs, etc.)
     * @returns Array of uploaded file paths
     */
    async upload(
        files: Express.Multer.File[],
        context: TenderFileContext,
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
                const uploaded = await this.processAndSave(file, context, config);
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
        context: TenderFileContext,
        config: FileConfig,
    ): Promise<UploadedFile> {
        // Generate unique filename: timestamp_sanitizedName.ext
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 50);
        const fileName = `${timestamp}_${baseName}${ext}`;

        const relativePath = path.join(context, fileName);
        const absolutePath = path.join(this.baseUploadPath, relativePath);

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
        const absolutePath = path.join(this.baseUploadPath, filePath);
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
        const absolutePath = path.join(this.baseUploadPath, filePath);
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
        return path.join(this.baseUploadPath, filePath);
    }
}
