import { forwardRef, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { tenderExtractions } from '@db/schemas/tendering';
import { eq } from 'drizzle-orm';
import {
    PdfExtractionJobData,
    PdfExtractionJobResult,
    PdfExtractionJobState,
    PdfExtractionJobStatusResponse,
} from './types/pdf-extraction.types';
import { PdfExtractionProcessor } from './pdf-extraction.processor';

export interface EnqueueExtractionResult {
    jobId: string;
    status: 'enqueued' | 'existing_active' | 'existing_completed';
    fields?: Record<string, any>;
    missing_fields?: string[];
    self_classified_atc?: boolean;
    has_atc?: boolean;
    ambiguous_field_conflicts?: Record<string, any>;
    processing_time_ms?: number;
}

interface InMemoryJobRecord {
    jobId: string;
    state: PdfExtractionJobState;
    data: PdfExtractionJobData;
    progress: number | null;
    result: PdfExtractionJobResult | null;
    failedReason: string | null;
}

@Injectable()
export class PdfExtractionProducer {
    private readonly inMemoryJobs = new Map<string, InMemoryJobRecord>();

    constructor(
        @Inject('PDF_EXTRACTION_QUEUE')
        private readonly queue: Queue<PdfExtractionJobData, PdfExtractionJobResult>,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        @Optional()
        @Inject(forwardRef(() => PdfExtractionProcessor))
        private readonly processor?: PdfExtractionProcessor,
        @Optional()
        private readonly configService?: ConfigService,
        @Optional()
        @Inject(DRIZZLE)
        private readonly db?: DbInstance,
    ) {}

    private isRedisReady(): boolean {
        const client = (this.queue as any)?.opts?.connection;
        if (client && typeof client.status === 'string') {
            return client.status === 'ready';
        }
        return true;
    }

    /**
     * Enqueues a PDF extraction job with deterministic deduplication by tenderId.
     * If a job is already waiting/active/delayed for this tender, returns the existing job.
     * If a previous job completed or failed, removes it and enqueues a fresh extraction.
     * In local development when Redis is offline, falls back to in-process execution.
     */
    async enqueueExtraction(data: PdfExtractionJobData): Promise<EnqueueExtractionResult> {
        const jobId = `extract-tender-${data.tenderId}`;

        // 1. Check PostgreSQL durable storage first (unless force re-extraction is requested)
        if (!data.force && this.db) {
            try {
                const [saved] = await this.db
                    .select()
                    .from(tenderExtractions)
                    .where(eq(tenderExtractions.tenderId, data.tenderId))
                    .limit(1);

                if (saved && saved.fields && Object.keys(saved.fields).length > 0) {
                    this.logger.info(
                        `[PdfExtractionProducer] Durable extraction already exists in database for tender ${data.tenderId}. Returning existing completed extraction without re-running (saving Claude tokens).`,
                        { tenderId: data.tenderId, jobId },
                    );
                    let selfClassifiedAtc = false;
                    let hasAtc = false;
                    if (saved.fields && typeof saved.fields === 'object') {
                        for (const val of Object.values(saved.fields) as any[]) {
                            if (val?.sources?.self_classified_atc) {
                                selfClassifiedAtc = true;
                            }
                            if (val?.sources?.atc) {
                                hasAtc = true;
                            }
                        }
                    }
                    return {
                        jobId,
                        status: 'existing_completed',
                        fields: saved.fields as Record<string, any>,
                        missing_fields: saved.missingFields || [],
                        self_classified_atc: selfClassifiedAtc,
                        has_atc: hasAtc,
                    };
                }
            } catch (dbErr: any) {
                this.logger.warn(`[PdfExtractionProducer] Could not check existing extraction in DB: ${dbErr?.message}`);
            }
        }

        if (!this.isRedisReady()) {
            const existing = this.inMemoryJobs.get(jobId);
            if (existing && (existing.state === 'active' || existing.state === 'waiting')) {
                this.logger.info(
                    `[PdfExtractionProducer] Job ${jobId} is currently '${existing.state}' (in-memory). Returning existing job without re-queueing.`,
                    { tenderId: data.tenderId, jobId, state: existing.state },
                );
                return { jobId, status: 'existing_active' };
            }

            if (existing && existing.state === 'completed' && !data.force) {
                this.logger.info(
                    `[PdfExtractionProducer] In-memory job ${jobId} already completed. Returning existing extraction without re-queueing.`,
                    { tenderId: data.tenderId, jobId },
                );
                return {
                    jobId,
                    status: 'existing_completed',
                    fields: existing.result?.fields,
                    missing_fields: existing.result?.missing_fields,
                    self_classified_atc: existing.result?.self_classified_atc,
                    has_atc: existing.result?.has_atc,
                    ambiguous_field_conflicts: existing.result?.ambiguous_field_conflicts,
                };
            }

            this.inMemoryJobs.set(jobId, {
                jobId,
                state: 'active',
                data,
                progress: 0,
                result: null,
                failedReason: null,
            });

            this.logger.info(
                `[PdfExtractionProducer] Redis is offline. Enqueued extraction job ${jobId} for tender ${data.tenderId} in-process.`,
                { tenderId: data.tenderId, jobId, pdfPath: data.pdfPath, userId: data.userId },
            );

            if (this.processor) {
                const serviceUrl =
                    this.configService?.get<string>('volksAi.serviceUrl') ||
                    this.configService?.get<string>('volksAi.VOLKS_AI_SERVICE_URL') ||
                    'http://localhost:8001';

                const timeoutMs =
                    this.configService?.get<number>('volksAi.timeoutMs') ||
                    this.configService?.get<number>('volksAi.VOLKS_AI_TIMEOUT_MS') ||
                    120000;

                setImmediate(async () => {
                    try {
                        const result = await this.processor!.processJob(
                            { id: jobId, data } as any,
                            serviceUrl,
                            timeoutMs,
                        );
                        this.inMemoryJobs.set(jobId, {
                            jobId,
                            state: 'completed',
                            data,
                            progress: 100,
                            result,
                            failedReason: null,
                        });
                        this.logger.info(
                            `[PdfExtractionProducer] In-process extraction completed for ${jobId}`,
                            { tenderId: data.tenderId, jobId },
                        );
                    } catch (err: any) {
                        this.inMemoryJobs.set(jobId, {
                            jobId,
                            state: 'failed',
                            data,
                            progress: null,
                            result: null,
                            failedReason: err?.message || 'In-process PDF extraction failed',
                        });
                        this.logger.error(
                            `[PdfExtractionProducer] In-process extraction failed for ${jobId}: ${err?.message}`,
                            { tenderId: data.tenderId, jobId, error: err?.stack },
                        );
                    }
                });
            }

            return { jobId, status: 'enqueued' };
        }

        const existingJob = await this.queue.getJob(jobId);
        if (existingJob) {
            const state = await existingJob.getState();
            if (state === 'active' || state === 'waiting' || state === 'delayed') {
                this.logger.info(
                    `[PdfExtractionProducer] Job ${jobId} is currently '${state}'. Returning existing job without re-queueing.`,
                    { tenderId: data.tenderId, jobId, state },
                );
                return { jobId, status: 'existing_active' };
            }

            if (state === 'completed' && !data.force) {
                this.logger.info(
                    `[PdfExtractionProducer] Job ${jobId} previously finished with state '${state}'. Returning existing extraction without re-queueing (saving tokens).`,
                    { tenderId: data.tenderId, jobId, state },
                );
                return {
                    jobId,
                    status: 'existing_completed',
                    fields: existingJob.returnvalue?.fields,
                    missing_fields: existingJob.returnvalue?.missing_fields,
                    self_classified_atc: existingJob.returnvalue?.self_classified_atc,
                    has_atc: existingJob.returnvalue?.has_atc,
                    ambiguous_field_conflicts: existingJob.returnvalue?.ambiguous_field_conflicts,
                };
            }

            this.logger.info(
                `[PdfExtractionProducer] Job ${jobId} previously finished with state '${state}'. Removing old job for fresh run.`,
                { tenderId: data.tenderId, jobId, state },
            );
            await existingJob.remove();
        }

        await this.queue.add('extract-pdf', data, {
            jobId,
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: {
                age: 24 * 3600, // keep for 24 hours
                count: 1000,
            },
            removeOnFail: {
                age: 7 * 24 * 3600, // keep for 7 days
                count: 5000,
            },
        });

        this.logger.info(
            `[PdfExtractionProducer] Enqueued extraction job ${jobId} for tender ${data.tenderId}`,
            { tenderId: data.tenderId, jobId, pdfPath: data.pdfPath, userId: data.userId },
        );

        return { jobId, status: 'enqueued' };
    }

    /**
     * Retrieves the status, execution progress, results, or failure reason for a given job.
     */
    async getJobStatus(jobId: string): Promise<PdfExtractionJobStatusResponse | null> {
        const inMem = this.inMemoryJobs.get(jobId);
        if (inMem) {
            return {
                jobId,
                state: inMem.state,
                progress: inMem.progress,
                data: inMem.data,
                result: inMem.state === 'completed' ? inMem.result : null,
                failedReason: inMem.state === 'failed' ? inMem.failedReason : null,
            };
        }

        if (this.isRedisReady()) {
            const job = await this.queue.getJob(jobId);
            if (job) {
                const state = (await job.getState()) as PdfExtractionJobState;
                return {
                    jobId: (job.id as string) || jobId,
                    state,
                    progress: job.progress,
                    data: job.data,
                    result: state === 'completed' ? (job.returnvalue as PdfExtractionJobResult) : null,
                    failedReason: state === 'failed' ? job.failedReason : null,
                };
            }
        }

        // Fallback: check PostgreSQL durable storage if job is not in Redis or Redis is offline
        if (this.db) {
            const numericTenderId = Number(jobId.replace(/^extract-tender-/, ''));
            if (!Number.isNaN(numericTenderId) && numericTenderId > 0) {
                try {
                    const [saved] = await this.db
                        .select()
                        .from(tenderExtractions)
                        .where(eq(tenderExtractions.tenderId, numericTenderId))
                        .limit(1);

                    if (saved && saved.fields) {
                        return {
                            jobId,
                            state: 'completed',
                            data: { tenderId: numericTenderId, pdfPath: '', userId: saved.userId || 0 },
                            result: {
                                extraction_version: saved.extractionVersion || '1.0.0',
                                fields: saved.fields as any,
                                missing_fields: saved.missingFields || [],
                                processing_time_ms: saved.processingTimeMs || 0,
                            },
                        };
                    }
                } catch (dbErr: any) {
                    this.logger.warn(`[PdfExtractionProducer] Error querying DB in getJobStatus: ${dbErr?.message}`);
                }
            }
        }

        return null;
    }
}
