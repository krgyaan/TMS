import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { startHeartbeat } from '@/infra/queue/worker-heartbeat';
import { PdfExtractionJobData, PdfExtractionJobResult } from './types/pdf-extraction.types';

@Injectable()
export class PdfExtractionProcessor implements OnModuleInit {
    private worker: Worker<PdfExtractionJobData, PdfExtractionJobResult>;

    constructor(
        private readonly configService: ConfigService,
        private readonly fileUploadService: FileUploadService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
    ) {}

    onModuleInit() {
        const host = this.configService.get<string>('redis.host') || '127.0.0.1';
        const port = this.configService.get<number>('redis.port') || 6379;

        const serviceUrl =
            this.configService.get<string>('volksAi.serviceUrl') ||
            this.configService.get<string>('volksAi.VOLKS_AI_SERVICE_URL') ||
            'http://localhost:8001';

        const timeoutMs =
            this.configService.get<number>('volksAi.timeoutMs') ||
            this.configService.get<number>('volksAi.VOLKS_AI_TIMEOUT_MS') ||
            120000;

        startHeartbeat({
            key: 'worker:pdf-extraction',
            host,
            port,
            queue: 'pdf-extraction-queue',
        });

        this.worker = new Worker<PdfExtractionJobData, PdfExtractionJobResult>(
            'pdf-extraction-queue',
            async (job: Job<PdfExtractionJobData, PdfExtractionJobResult>) => {
                return this.processJob(job, serviceUrl, timeoutMs);
            },
            {
                connection: { host, port },
                concurrency: 2,
                lockDuration: 180000, // 3 minutes lock to cover long PDF processing
                stalledInterval: 60000,
            },
        );

        this.worker.on('failed', (job, err) => {
            this.logger.error('[PdfExtractionProcessor] Job failed', {
                jobId: job?.id,
                tenderId: job?.data?.tenderId,
                error: err.message,
                attemptsMade: job?.attemptsMade,
            });
        });

        this.logger.info(
            `[PdfExtractionProcessor] Worker initialized for 'pdf-extraction-queue' (target: ${serviceUrl}, timeout: ${timeoutMs}ms)`,
        );
    }

    /**
     * Executes the extraction workflow for a single job:
     * 1. Resolves PDF file path using FileUploadService.
     * 2. Reads PDF bytes and constructs multipart/form-data.
     * 3. Dispatches POST /extract to the VolksAI FastAPI service with timeout.
     * 4. Returns extraction result without writing to the database.
     */
    async processJob(
        job: Job<PdfExtractionJobData, PdfExtractionJobResult>,
        serviceUrl: string,
        timeoutMs: number,
    ): Promise<PdfExtractionJobResult> {
        const { tenderId, pdfPath, userId } = job.data;

        this.logger.info(`[PdfExtractionProcessor] Starting extraction for tender ${tenderId}`, {
            jobId: job.id,
            tenderId,
            pdfPath,
            userId,
        });

        // Resolve absolute path from existing file storage
        const resolvedPath = this.resolvePdfPath(pdfPath);
        if (!fs.existsSync(resolvedPath)) {
            const errorMsg = `PDF file not found at path: '${pdfPath}' (resolved to '${resolvedPath}')`;
            this.logger.error(`[PdfExtractionProcessor] ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const fileStats = await fs.promises.stat(resolvedPath);
        this.logger.info(
            `[PdfExtractionProcessor] Reading PDF '${path.basename(resolvedPath)}' (${fileStats.size} bytes)`,
            { tenderId, resolvedPath, sizeBytes: fileStats.size },
        );

        const fileBuffer = await fs.promises.readFile(resolvedPath);
        const fileName = path.basename(resolvedPath);
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('pdf_file', blob, fileName);

        const endpoint = `${serviceUrl.replace(/\/+$/, '')}/extract`;
        this.logger.info(`[PdfExtractionProcessor] Dispatching POST to ${endpoint} with ${timeoutMs}ms timeout...`, {
            tenderId,
            endpoint,
        });

        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (err: unknown) {
            const error = err as Error;
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                const timeoutMsg = `VolksAI extraction service timed out after ${timeoutMs}ms for tender ${tenderId} (URL: ${endpoint})`;
                this.logger.error(`[PdfExtractionProcessor] ${timeoutMsg}`);
                throw new Error(timeoutMsg);
            }
            const networkMsg = `Failed to connect to VolksAI service at ${endpoint}: ${error.message}`;
            this.logger.error(`[PdfExtractionProcessor] ${networkMsg}`, { error: error.stack });
            throw new Error(networkMsg);
        }

        if (!response.ok) {
            const responseText = await response.text();
            const failureMsg = `VolksAI extraction failed with HTTP ${response.status} (${response.statusText}): ${responseText}`;
            this.logger.error(`[PdfExtractionProcessor] ${failureMsg}`, {
                tenderId,
                status: response.status,
            });
            throw new Error(failureMsg);
        }

        const extractionResult = (await response.json()) as PdfExtractionJobResult;

        const fieldCount = Object.keys(extractionResult.fields || {}).length;
        const missingCount = (extractionResult.missing_fields || []).length;

        this.logger.info(
            `[PdfExtractionProcessor] Extraction successful for tender ${tenderId}: ${fieldCount} fields resolved, ${missingCount} missing, ${extractionResult.processing_time_ms}ms server time`,
            {
                tenderId,
                jobId: job.id,
                fieldCount,
                missingCount,
                processingTimeMs: extractionResult.processing_time_ms,
            },
        );

        // Return result directly to BullMQ (stored in Redis returnvalue, non-destructive, no DB writes)
        return extractionResult;
    }

    /**
     * Resolves the given PDF path to an absolute filesystem path using
     * FileUploadService or fallback local path resolution.
     */
    resolvePdfPath(pdfPath: string): string {
        if (path.isAbsolute(pdfPath)) {
            return pdfPath;
        }

        try {
            const uploadPath = this.fileUploadService.getAbsolutePath(pdfPath);
            if (fs.existsSync(uploadPath)) {
                return uploadPath;
            }
        } catch {
            // Ignore resolution errors and fallback to cwd resolution
        }

        return path.resolve(pdfPath);
    }
}
