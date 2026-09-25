import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { tenderExtractions } from '@db/schemas/tendering';
import { eq } from 'drizzle-orm';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { ClaudeUsageService } from '@/modules/master/health/claude-usage.service';
import { startHeartbeat } from '@/infra/queue/worker-heartbeat';
import { PdfExtractionJobData, PdfExtractionJobResult } from './types/pdf-extraction.types';

@Injectable()
export class PdfExtractionProcessor implements OnModuleInit {
    private worker: Worker<PdfExtractionJobData, PdfExtractionJobResult>;

    constructor(
        private readonly configService: ConfigService,
        private readonly fileUploadService: FileUploadService,
        private readonly claudeUsageService: ClaudeUsageService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        @Optional()
        @Inject(DRIZZLE)
        private readonly db?: DbInstance,
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

        this.worker.on('error', (err) => {
            // Suppress unhandled error crash when Redis is offline in local development
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
        const { tenderId, pdfPath, mainTenderPath, atcPaths, boqPath, userId } = job.data;
        const primaryPdf = mainTenderPath || pdfPath;

        this.logger.info(`[AutoExtract] Extraction started for tender ${tenderId}`, {
            event_type: 'autoextract_save',
            action: 'extraction_started',
            jobId: job.id,
            tenderId,
            primaryPdf,
            atcCount: atcPaths?.length || 0,
            hasBoq: Boolean(boqPath),
            userId,
        });

        // Resolve absolute path from existing file storage
        const resolvedPath = this.resolvePdfPath(primaryPdf);
        if (!fs.existsSync(resolvedPath)) {
            const errorMsg = `PDF file not found at path: '${primaryPdf}' (resolved to '${resolvedPath}')`;
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

        // Attach ATC files if provided
        if (atcPaths && Array.isArray(atcPaths)) {
            for (const atcPath of atcPaths) {
                try {
                    const resolvedAtc = this.resolvePdfPath(atcPath);
                    if (fs.existsSync(resolvedAtc)) {
                        const atcBuffer = await fs.promises.readFile(resolvedAtc);
                        const atcBlob = new Blob([atcBuffer], { type: 'application/pdf' });
                        formData.append('atc_files', atcBlob, path.basename(resolvedAtc));
                    }
                } catch (atcErr) {
                    this.logger.warn(`[PdfExtractionProcessor] Could not load ATC file '${atcPath}': ${(atcErr as Error).message}`);
                }
            }
        }

        // Attach BOQ file if provided
        if (boqPath) {
            try {
                const resolvedBoq = this.resolvePdfPath(boqPath);
                if (fs.existsSync(resolvedBoq)) {
                    const boqBuffer = await fs.promises.readFile(resolvedBoq);
                    const boqBlob = new Blob([boqBuffer], { type: 'application/pdf' });
                    formData.append('boq_file', boqBlob, path.basename(resolvedBoq));
                }
            } catch (boqErr) {
                this.logger.warn(`[PdfExtractionProcessor] Could not load BOQ file '${boqPath}': ${(boqErr as Error).message}`);
            }
        }

        if (userId) {
            formData.append('user_id', String(userId));
        }

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
            `[AutoExtract] Extraction result received for tender ${tenderId}: ${fieldCount} fields resolved, ${missingCount} missing, ${extractionResult.processing_time_ms}ms server time`,
            {
                event_type: 'autoextract_save',
                action: 'extraction_result_received',
                tenderId,
                jobId: job.id,
                fieldsCount: fieldCount,
                missingCount,
                processingTimeMs: extractionResult.processing_time_ms,
            },
        );

        // Record Claude API token usage & per-stage metrics into claude_token_usage & sliding window TPM
        if (extractionResult.llm_usage) {
            try {
                await this.claudeUsageService.recordUsage({
                    userId,
                    tenderId,
                    jobId: job.id,
                    durationMs: extractionResult.processing_time_ms,
                    usage: extractionResult.llm_usage,
                });
            } catch (usageErr: unknown) {
                const fallbackUsagePayload = {
                    tag: 'CLAUDE_USAGE_FALLBACK_RECOVERY',
                    tenderId,
                    jobId: job.id,
                    userId: userId || null,
                    failureTimestamp: new Date().toISOString(),
                    error: (usageErr as Error).message,
                    llm_usage: extractionResult.llm_usage,
                };
                this.logger.error(
                    `[CLAUDE_USAGE_FALLBACK_RECOVERY] Failed to record Claude usage for job ${job.id}: ${JSON.stringify(fallbackUsagePayload)}`,
                    {
                        event_type: 'claude_usage_save',
                        action: 'processor_usage_failure_fallback_logged',
                        tenderId,
                        jobId: job.id,
                        error: (usageErr as Error).message,
                        stack: (usageErr as Error).stack,
                        fallbackUsagePayload,
                    },
                );
            }
        }

        // Durable Database Persistence: Save extraction result to tender_extractions table (if db is provided)
        if (this.db) {
            try {
                this.logger.info(`[AutoExtract] Sending save request to persist extraction for tender ${tenderId}`, {
                    event_type: 'autoextract_save',
                    action: 'save_request_sent',
                    tenderId,
                    fieldsCount: fieldCount,
                });

                await this.db
                    .insert(tenderExtractions)
                    .values({
                        tenderId,
                        fields: extractionResult.fields,
                        missingFields: extractionResult.missing_fields,
                        extractionVersion: extractionResult.extraction_version || '1.0.0',
                        processingTimeMs: extractionResult.processing_time_ms,
                        userId: userId || null,
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: tenderExtractions.tenderId,
                        set: {
                            fields: extractionResult.fields,
                            missingFields: extractionResult.missing_fields,
                            extractionVersion: extractionResult.extraction_version || '1.0.0',
                            processingTimeMs: extractionResult.processing_time_ms,
                            userId: userId || null,
                            updatedAt: new Date(),
                        },
                    });

                this.logger.info(`[AutoExtract] Extraction result saved successfully for tender ${tenderId}`, {
                    event_type: 'autoextract_save',
                    action: 'save_success',
                    tenderId,
                    fieldsCount: fieldCount,
                });

                // Follow-up check: confirm persisted data matches
                const [persistedRow] = await this.db
                    .select()
                    .from(tenderExtractions)
                    .where(eq(tenderExtractions.tenderId, tenderId))
                    .limit(1);

                const persistedFieldsCount = persistedRow ? Object.keys(persistedRow.fields || {}).length : 0;
                const matches = Boolean(persistedRow && persistedFieldsCount === fieldCount);

                this.logger.info(`[AutoExtract] Follow-up check for tender ${tenderId}: verified=${matches}`, {
                    event_type: 'autoextract_save',
                    action: 'followup_check',
                    tenderId,
                    verified: matches,
                    persistedFieldsCount,
                });
            } catch (dbErr: any) {
                const underlyingError = dbErr?.cause?.message || dbErr?.message || String(dbErr);
                const fallbackRecoveryPayload = {
                    tag: 'EXTRACTION_FALLBACK_RECOVERY',
                    tenderId,
                    jobId: job.id,
                    userId: userId || null,
                    failureTimestamp: new Date().toISOString(),
                    error: underlyingError,
                    rawExtraction: {
                        fields: extractionResult.fields,
                        missing_fields: extractionResult.missing_fields,
                        extraction_version: extractionResult.extraction_version || '1.0.0',
                        processing_time_ms: extractionResult.processing_time_ms,
                    },
                };

                this.logger.error(
                    `[EXTRACTION_FALLBACK_RECOVERY] Failed to persist extraction to database: ${JSON.stringify(fallbackRecoveryPayload)}`,
                    {
                        event_type: 'autoextract_save',
                        action: 'save_failure_fallback_logged',
                        tenderId,
                        jobId: job.id,
                        error: underlyingError,
                        stack: dbErr?.stack,
                        fallbackRecoveryPayload,
                    },
                );

                const saveErrorMsg = `EXTRACTION_SAVE_FAILED: Failed to persist extraction result for tender ${tenderId} to database: ${underlyingError}`;
                throw new Error(saveErrorMsg);
            }
        }

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
