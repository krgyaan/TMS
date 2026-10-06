import { AppLogger } from '@/logger/app-logger.service';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { ClaudeUsageService } from '@/modules/master/claude-usage/claude-usage.service';
import { FinanceDocumentsService } from '@/modules/shared/finance-documents/finance-documents.service';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { tenderExtractions } from '@db/schemas/tendering/tender-extractions.schema';
import {
    biddingRequirementsJobs,
    type BiddingRequirementsJob,
} from '@db/schemas/tendering/bidding-requirements-jobs.schema';
import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    GatewayTimeoutException,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    NotFoundException,
    Optional,
    ServiceUnavailableException,
    StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type IORedis from 'ioredis';

export type SuggestedRequirementCategory = 'oem' | 'standard' | 'company' | 'other';
export type SuggestedRequirementConfidence = 'high' | 'medium' | 'low';

export interface SuggestedBiddingRequirement {
    documentName: string;
    category: SuggestedRequirementCategory;
    required: boolean;
    source: {
        document: 'main' | 'atc';
        page: number;
        snippet: string;
    };
    matchedLibraryId: string | null;
    confidence: SuggestedRequirementConfidence;
    reasoning: string;
}

export type AnnexureBlock =
    | { type: 'heading'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'blank_field'; label: string }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'signature_line'; label: string };

export interface SuggestedAnnexure {
    annexureName: string;
    source: {
        document: 'main' | 'atc';
        page: number;
        snippet: string;
    };
    blocks: AnnexureBlock[];
    droppedBlocks?: number;
}

/**
 * Version of the VolksAI extraction shape this code understands (VolksAI's
 * TENDER_KNOWLEDGE_SCHEMA_VERSION). Cached entries with a missing or lower
 * schemaVersion are treated as absent and re-extracted, so growing the shape never
 * serves incomplete old-shape data as if it were current.
 *   1: requirements[] + annexures[]
 */
export const BIDDING_REQUIREMENTS_SCHEMA_VERSION = 1;

/**
 * Minimum wait for VolksAI's /analyze-bidding-requirements: its single Sonnet call now
 * returns requirements AND annexure structures (Claude timeout 180s in VolksAI), plus PDF
 * text extraction/OCR before it. 240s = 180s + 60s headroom.
 */
export const BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS = 240000;

/**
 * Cross-process lock for one tender's analysis (Redis SET NX PX). Held while a VolksAI
 * dispatch is running so a second API process never starts a second paid analysis for
 * the same tender. The TTL outlasts the longest dispatch so a crashed holder frees it.
 */
export const BIDDING_REQUIREMENTS_LOCK_TTL_MS = BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS + 60000;
export const BIDDING_REQUIREMENTS_LOCK_POLL_MS = 2000;
const lockKey = (tenderId: number) => `bidding-requirements:lock:${tenderId}`;
// Delete the lock only if we still own it (a stale holder must not free a newer lock).
const RELEASE_LOCK_LUA =
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

import {
    STANDARD_CHECKLIST_DOCUMENTS,
    type StandardChecklistDocument,
} from './standard-documents.constant';
export { STANDARD_CHECKLIST_DOCUMENTS, type StandardChecklistDocument };

export const JOB_HEARTBEAT_TIMEOUT_MS = 60_000; // 60 seconds without heartbeat = dead job
export const MAX_JOB_DURATION_MS = BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS + 60000; // 300,000ms = 5 minutes absolute cap

export interface BiddingRequirementsAnalysisResult {
    jobId: string;
    requirements: SuggestedBiddingRequirement[];
    llmUsage: Record<string, unknown> | null;
    schemaVersion: number;
    annexures: SuggestedAnnexure[];
    rejectedAnnexures: { annexureName: string | null; reason: string }[];
    truncated: boolean;
}

export type BiddingRequirementsErrorCode =
    | 'VOLKSAI_UNREACHABLE'
    | 'LLM_UNAVAILABLE'
    | 'ANALYSIS_TIMEOUT'
    | 'ANALYSIS_FAILED';

export interface BiddingRequirementsJobStatusResponse {
    jobId: number | null;
    tenderId: number;
    status: 'idle' | 'pending' | 'running' | 'done' | 'failed';
    documentHash: string | null;
    analysis: BiddingRequirementsAnalysisResult | null;
    error: {
        code: string;
        message: string;
    } | null;
}

interface VolksAiBiddingRequirementsResponse {
    job_id: string;
    requirements: SuggestedBiddingRequirement[];
    llm_usage: Record<string, unknown> | null;
    schemaVersion?: number;
    annexures?: SuggestedAnnexure[];
    rejectedAnnexures?: { annexureName: string | null; reason: string }[];
    truncated?: boolean;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Bridges document-checklist auto-suggestion to VolksAI's `/analyze-bidding-requirements`
 * endpoint: resolves the tender's main + ATC PDFs (reusing the same resolution logic as
 * PDF field extraction), builds the company document library from `finance_documents`,
 * and forwards both as multipart form data.
 *
 * Implements asynchronous background execution with database job tracking,
 * idempotency on (tender, document_hash), and typed HttpException subclasses.
 */
@Injectable()
export class BiddingRequirementsService {
    private readonly logger;

    /**
     * In-process de-duplication: tenderId -> the analysis currently running for it.
     */
    private readonly inFlight = new Map<number, Promise<BiddingRequirementsAnalysisResult>>();

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly configService: ConfigService,
        private readonly fileUploadService: FileUploadService,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderInfoSheetsService: TenderInfoSheetsService,
        private readonly financeDocumentsService: FinanceDocumentsService,
        private readonly claudeUsageService: ClaudeUsageService,
        @Optional() @Inject('REDIS_CONNECTION') private readonly redis?: IORedis | null,
    ) {
        this.logger = this.appLogger.withContext(BiddingRequirementsService.name);
    }

    /**
     * Determines whether an in-flight job is stuck/dead:
     * - Dead if last heartbeat is older than JOB_HEARTBEAT_TIMEOUT_MS (60s)
     * - Stuck if total duration exceeds MAX_JOB_DURATION_MS (5m)
     */
    public isJobStuck(job: BiddingRequirementsJob): boolean {
        if (job.status !== 'running' && job.status !== 'pending') return false;
        const now = Date.now();

        // 1. Check heartbeat freshness (60s threshold)
        const lastHeartbeat = job.heartbeatAt || job.startedAt || job.updatedAt || job.createdAt;
        if (lastHeartbeat) {
            const lastHeartbeatTime =
                lastHeartbeat instanceof Date ? lastHeartbeat.getTime() : new Date(lastHeartbeat).getTime();
            if (!isNaN(lastHeartbeatTime) && now - lastHeartbeatTime > JOB_HEARTBEAT_TIMEOUT_MS) {
                return true;
            }
        }

        // 2. Absolute duration guard (5m)
        const started = job.startedAt || job.createdAt;
        if (started) {
            const startTime = started instanceof Date ? started.getTime() : new Date(started).getTime();
            if (!isNaN(startTime) && now - startTime > MAX_JOB_DURATION_MS) {
                return true;
            }
        }

        return false;
    }

    /**
     * Marks a stuck job as failed so that subsequent requests or retries can execute freshly.
     */
    public async markJobAsStuckFailed(jobId: number): Promise<BiddingRequirementsJob> {
        this.logger.warn(
            `[BiddingRequirementsJob] Marking stuck job ${jobId} as failed (heartbeat older than ${JOB_HEARTBEAT_TIMEOUT_MS / 1000}s or exceeded max duration)`,
        );
        const [updated] = await this.db
            .update(biddingRequirementsJobs)
            .set({
                status: 'failed',
                errorCode: 'ANALYSIS_TIMEOUT',
                errorMessage: 'Analysis job heartbeat stalled (>60s) or server restarted while job was in-flight',
                updatedAt: new Date(),
            })
            .where(eq(biddingRequirementsJobs.id, jobId))
            .returning();
        return updated;
    }

    /**
     * Computes a SHA-256 hash across the main tender PDF, any ATC PDFs,
     * the extraction schema version, and the master checklist document IDs.
     * This ensures any change in document files, schema, or master prompt automatically
     * invalidates cached job rows and generates fresh analyses.
     */
    public async computeDocumentHash(mainPath: string, atcPaths: string[] = []): Promise<string> {
        const hash = crypto.createHash('sha256');
        hash.update(`schema_v${BIDDING_REQUIREMENTS_SCHEMA_VERSION}:prompt_v2:`);
        for (const doc of STANDARD_CHECKLIST_DOCUMENTS) {
            hash.update(`${doc.id}:${doc.document_name};`);
        }
        if (fs.existsSync(mainPath)) {
            const mainBuffer = await fs.promises.readFile(mainPath);
            hash.update(mainBuffer);
        } else {
            hash.update(mainPath);
        }
        for (const atcPath of atcPaths) {
            try {
                const resolvedAtc = this.resolvePdfPath(atcPath);
                if (fs.existsSync(resolvedAtc)) {
                    const atcBuffer = await fs.promises.readFile(resolvedAtc);
                    hash.update(atcBuffer);
                } else {
                    hash.update(atcPath);
                }
            } catch {
                hash.update(atcPath);
            }
        }
        return hash.digest('hex');
    }

    /**
     * Starts an asynchronous bidding requirements analysis job or returns an existing one.
     * Idempotency guarantee:
     *   - If a completed job exists for (tenderId, documentHash) and !forceRefresh, returns the saved result immediately.
     *   - If a job is currently 'running' or 'pending' and not stuck, returns the active job immediately (no duplicate call).
     *   - If stuck or failed, allows immediate restart/retry.
     *   - If forceRefresh or new, starts background analysis and returns status 'pending' immediately.
     */
    async startOrGetAnalysis(
        tenderId: number,
        forceRefresh = false,
        userId?: number,
    ): Promise<BiddingRequirementsJobStatusResponse> {
        const tender = await this.tenderInfosService.validateExists(tenderId);
        const resolvedDocs = this.tenderInfoSheetsService.resolveTenderDocuments(tender.documents);
        const mainPath = this.resolvePdfPath(resolvedDocs.mainTenderPath);
        if (!fs.existsSync(mainPath)) {
            throw new BadRequestException(
                `Tender main document not found at '${resolvedDocs.mainTenderPath}' (resolved to '${mainPath}')`,
            );
        }

        const documentHash = await this.computeDocumentHash(mainPath, resolvedDocs.atcPaths);

        // Check if an existing job exists for this (tender, documentHash)
        let [existingJob] = await this.db
            .select()
            .from(biddingRequirementsJobs)
            .where(
                and(
                    eq(biddingRequirementsJobs.tenderId, tenderId),
                    eq(biddingRequirementsJobs.documentHash, documentHash),
                ),
            );

        if (existingJob && this.isJobStuck(existingJob)) {
            existingJob = await this.markJobAsStuckFailed(existingJob.id);
        }

        // 1. Idempotency: If job is already 'done' and not forceRefresh, return saved result immediately with no LLM call
        if (existingJob?.status === 'done' && existingJob.result && !forceRefresh) {
            this.logger.log(
                `[BiddingRequirementsJob] Returning existing completed job ${existingJob.id} for tender ${tenderId} (hash: ${documentHash.slice(0, 12)})`,
            );
            return this.mapJobToResponse(existingJob);
        }

        // 2. Idempotency: If job is already running or pending and not stuck, return existing job (no duplicate LLM call)
        if (existingJob?.status === 'running' || existingJob?.status === 'pending') {
            this.logger.log(
                `[BiddingRequirementsJob] Joining in-flight job ${existingJob.id} (${existingJob.status}) for tender ${tenderId}`,
            );
            return this.mapJobToResponse(existingJob);
        }

        // 3. Create or reset the unique row on (tender, documentHash)
        let job: BiddingRequirementsJob;
        const now = new Date();
        if (existingJob) {
            const [updated] = await this.db
                .update(biddingRequirementsJobs)
                .set({
                    status: 'pending',
                    errorCode: null,
                    errorMessage: null,
                    result: null,
                    startedAt: now,
                    heartbeatAt: now,
                    userId: userId || existingJob.userId,
                    updatedAt: now,
                })
                .where(eq(biddingRequirementsJobs.id, existingJob.id))
                .returning();
            job = updated;
        } else {
            const [inserted] = await this.db
                .insert(biddingRequirementsJobs)
                .values({
                    tenderId,
                    documentHash,
                    status: 'pending',
                    startedAt: now,
                    heartbeatAt: now,
                    userId,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoUpdate({
                    target: [biddingRequirementsJobs.tenderId, biddingRequirementsJobs.documentHash],
                    set: {
                        status: 'pending',
                        errorCode: null,
                        errorMessage: null,
                        result: null,
                        startedAt: now,
                        heartbeatAt: now,
                        updatedAt: now,
                    },
                })
                .returning();
            job = inserted;
        }

        // Fire and forget in the background (no proxy or client timeout)
        this.executeJobInBackground(job.id, tenderId, tender, resolvedDocs, mainPath, userId).catch(
            (err) => {
                this.logger.error(
                    `[BiddingRequirementsJob] Unhandled background failure for job ${job.id}: ${(err as Error).message}`,
                );
            },
        );

        return this.mapJobToResponse(job);
    }

    /**
     * Executes the VolksAI dispatch in the background and updates the job row.
     * Maintains heartbeat timestamps while processing to detect hung workers.
     */
    private async executeJobInBackground(
        jobId: number,
        tenderId: number,
        tender: Awaited<ReturnType<TenderInfosService['validateExists']>>,
        resolvedDocs: ReturnType<TenderInfoSheetsService['resolveTenderDocuments']>,
        mainPath: string,
        userId?: number,
    ): Promise<void> {
        const now = new Date();
        await this.db
            .update(biddingRequirementsJobs)
            .set({ status: 'running', startedAt: now, heartbeatAt: now, updatedAt: now })
            .where(eq(biddingRequirementsJobs.id, jobId));

        // Periodic heartbeat update while dispatch is running
        const heartbeatTimer = setInterval(async () => {
            try {
                await this.db
                    .update(biddingRequirementsJobs)
                    .set({ heartbeatAt: new Date() })
                    .where(eq(biddingRequirementsJobs.id, jobId));
            } catch (hbErr) {
                this.logger.debug(
                    `[BiddingRequirementsJob] Heartbeat update failed for job ${jobId}: ${(hbErr as Error).message}`,
                );
            }
        }, 15000);

        const startTime = Date.now();
        try {
            const analysisResult = await this.dispatchAnalysis(
                tenderId,
                tender,
                resolvedDocs,
                mainPath,
                userId,
            );
            const durationMs = Date.now() - startTime;

            await this.db
                .update(biddingRequirementsJobs)
                .set({
                    status: 'done',
                    result: analysisResult,
                    processingTimeMs: durationMs,
                    heartbeatAt: new Date(),
                    errorCode: null,
                    errorMessage: null,
                    updatedAt: new Date(),
                })
                .where(eq(biddingRequirementsJobs.id, jobId));

            // Also persist into tender_extractions for backward compatibility with cached reads
            await this.cacheIntoTenderExtractions(tenderId, analysisResult, durationMs, userId);

            this.logger.log(
                `[BiddingRequirementsJob] Job ${jobId} completed successfully for tender ${tenderId} in ${durationMs}ms`,
            );
        } catch (err: unknown) {
            const durationMs = Date.now() - startTime;
            let code = 'ANALYSIS_FAILED';
            let message = 'Bidding requirements analysis failed';

            if (err instanceof HttpException) {
                const response = err.getResponse() as any;
                if (typeof response === 'object' && response !== null) {
                    code = response.code || 'ANALYSIS_FAILED';
                    message = response.message || err.message;
                } else if (typeof response === 'string') {
                    message = response;
                }
            } else if (err instanceof Error) {
                message = err.message;
            }

            this.logger.error(
                `[BiddingRequirementsJob] Job ${jobId} failed for tender ${tenderId} [${code}]: ${message}`,
                err instanceof Error ? err.stack : undefined,
            );

            await this.db
                .update(biddingRequirementsJobs)
                .set({
                    status: 'failed',
                    errorCode: code,
                    errorMessage: message,
                    processingTimeMs: durationMs,
                    heartbeatAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(biddingRequirementsJobs.id, jobId));
        } finally {
            clearInterval(heartbeatTimer);
        }
    }

    /**
     * Pollable status endpoint for bidding requirements analysis job.
     */
    async getJobStatus(tenderId: number): Promise<BiddingRequirementsJobStatusResponse> {
        await this.tenderInfosService.validateExists(tenderId);

        let [latestJob] = await this.db
            .select()
            .from(biddingRequirementsJobs)
            .where(eq(biddingRequirementsJobs.tenderId, tenderId))
            .orderBy(desc(biddingRequirementsJobs.updatedAt))
            .limit(1);

        if (latestJob) {
            if (this.isJobStuck(latestJob)) {
                latestJob = await this.markJobAsStuckFailed(latestJob.id);
            }
            return this.mapJobToResponse(latestJob);
        }

        // Backward compatibility: check tender_extractions cache
        const cachedAnalysis = await this.getCachedAnalysis(tenderId);
        if (cachedAnalysis) {
            return {
                jobId: null,
                tenderId,
                status: 'done',
                documentHash: null,
                analysis: cachedAnalysis,
                error: null,
            };
        }

        return {
            jobId: null,
            tenderId,
            status: 'idle',
            documentHash: null,
            analysis: null,
            error: null,
        };
    }

    private mapJobToResponse(job: BiddingRequirementsJob): BiddingRequirementsJobStatusResponse {
        return {
            jobId: job.id,
            tenderId: job.tenderId,
            status: job.status as 'pending' | 'running' | 'done' | 'failed',
            documentHash: job.documentHash,
            analysis: (job.result as BiddingRequirementsAnalysisResult) || null,
            error: job.errorCode
                ? {
                      code: job.errorCode,
                      message: job.errorMessage || 'Analysis failed',
                  }
                : null,
        };
    }

    /**
     * Synchronous analysis method (preserved for backward compatibility and unit tests).
     */
    async analyzeForTender(
        tenderId: number,
        forceRefresh = false,
        userId?: number,
    ): Promise<BiddingRequirementsAnalysisResult> {
        const tender = await this.tenderInfosService.validateExists(tenderId);

        const [existingExtraction] = await this.db
            .select()
            .from(tenderExtractions)
            .where(eq(tenderExtractions.tenderId, tenderId));

        const cachedAnalysis = this.readCurrentCache(existingExtraction?.fields, tenderId);

        if (!forceRefresh && cachedAnalysis) {
            this.logger.log(
                `Returning cached bidding-requirements analysis for tender ${tenderId} ` +
                    `(${cachedAnalysis.requirements.length} requirement(s), ${cachedAnalysis.annexures.length} annexure(s), ` +
                    `schemaVersion ${cachedAnalysis.schemaVersion})`,
            );
            return cachedAnalysis;
        }

        const running = this.inFlight.get(tenderId);
        if (running) {
            this.logger.log(`Joining in-flight bidding-requirements analysis for tender ${tenderId} (no second VolksAI dispatch)`);
            return running;
        }

        const resolvedDocs = this.tenderInfoSheetsService.resolveTenderDocuments(tender.documents);
        const mainPath = this.resolvePdfPath(resolvedDocs.mainTenderPath);
        if (!fs.existsSync(mainPath)) {
            throw new BadRequestException(
                `Tender main document not found at '${resolvedDocs.mainTenderPath}' (resolved to '${mainPath}')`,
            );
        }

        const run = this.runWithTenderLock(tenderId, async () => {
            const res = await this.dispatchAnalysis(tenderId, tender, resolvedDocs, mainPath, userId);
            await this.cacheIntoTenderExtractions(tenderId, res, 0, userId);
            return res;
        });

        this.inFlight.set(tenderId, run);
        try {
            return await run;
        } finally {
            if (this.inFlight.get(tenderId) === run) this.inFlight.delete(tenderId);
        }
    }

    /**
     * Cross-process guard (only when Redis is connected): acquires the tender's lock.
     */
    private async runWithTenderLock(
        tenderId: number,
        dispatch: () => Promise<BiddingRequirementsAnalysisResult>,
    ): Promise<BiddingRequirementsAnalysisResult> {
        const redis = this.redis && this.redis.status === 'ready' ? this.redis : null;
        if (!redis) return dispatch();

        const key = lockKey(tenderId);
        const token = randomUUID();
        let acquired: string | null;
        try {
            acquired = await redis.set(key, token, 'PX', BIDDING_REQUIREMENTS_LOCK_TTL_MS, 'NX');
        } catch (err) {
            this.logger.warn(`Redis lock unavailable for tender ${tenderId} (${(err as Error).message}); continuing without it`);
            return dispatch();
        }

        if (acquired === 'OK') {
            try {
                return await dispatch();
            } finally {
                try {
                    await redis.eval(RELEASE_LOCK_LUA, 1, key, token);
                } catch (err) {
                    this.logger.warn(`Could not release bidding-requirements lock for tender ${tenderId}: ${(err as Error).message}`);
                }
            }
        }

        this.logger.log(`Bidding-requirements analysis for tender ${tenderId} is running in another process; waiting for its result`);
        const deadline = Date.now() + BIDDING_REQUIREMENTS_LOCK_TTL_MS;
        while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, BIDDING_REQUIREMENTS_LOCK_POLL_MS));
            if (!(await redis.exists(key))) break;
        }
        const cached = await this.getCachedAnalysis(tenderId);
        if (cached) return cached;
        throw new ConflictException(
            `A bidding-requirements analysis for tender ${tenderId} was already running and did not produce a result; please retry`,
        );
    }

    /**
     * Dispatches the multipart/form-data request to VolksAI's /analyze-bidding-requirements.
     * Throws typed NestJS HttpException subclasses with structured codes and user-safe messages.
     */
    private async dispatchAnalysis(
        tenderId: number,
        tender: Awaited<ReturnType<TenderInfosService['validateExists']>>,
        resolvedDocs: ReturnType<TenderInfoSheetsService['resolveTenderDocuments']>,
        mainPath: string,
        userId: number | undefined,
    ): Promise<BiddingRequirementsAnalysisResult> {
        const libraryDocuments = await this.buildLibraryDocuments();

        const fileBuffer = await fs.promises.readFile(mainPath);
        const formData = new FormData();
        formData.append('pdf_file', new Blob([fileBuffer], { type: 'application/pdf' }), path.basename(mainPath));

        for (const atcPath of resolvedDocs.atcPaths) {
            try {
                const resolvedAtc = this.resolvePdfPath(atcPath);
                if (fs.existsSync(resolvedAtc)) {
                    const atcBuffer = await fs.promises.readFile(resolvedAtc);
                    formData.append('atc_files', new Blob([atcBuffer], { type: 'application/pdf' }), path.basename(resolvedAtc));
                }
            } catch (atcErr) {
                this.logger.warn(`Could not load ATC file '${atcPath}' for tender ${tenderId}: ${(atcErr as Error).message}`);
            }
        }

        formData.append('library_documents', JSON.stringify(libraryDocuments));

        const serviceUrl = this.getServiceUrl();
        const timeoutMs = Math.max(
            this.configService.get<number>('volksAi.timeoutMs') ||
                this.configService.get<number>('volksAi.VOLKS_AI_TIMEOUT_MS') ||
                120000,
            BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS,
        );

        const endpoint = `${serviceUrl}/analyze-bidding-requirements`;
        this.logger.log(
            `Dispatching bidding-requirements analysis for tender ${tenderId} to ${endpoint} ` +
            `(${resolvedDocs.atcPaths.length} ATC file(s), ${libraryDocuments.length} library doc(s))`,
        );

        const startTime = Date.now();
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
                this.logger.error(
                    `Bidding requirements analysis timed out after ${timeoutMs}ms for tender ${tenderId} (URL: ${endpoint})`,
                );
                throw new GatewayTimeoutException({
                    statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    code: 'ANALYSIS_TIMEOUT',
                    message: `Bidding requirements analysis timed out after ${Math.round(timeoutMs / 1000)}s for tender ${tenderId}. The document may be too large.`,
                });
            }
            this.logger.error(
                `Failed to connect to VolksAI service at ${endpoint} for tender ${tenderId}: ${error.message}`,
                error.stack,
            );
            throw new BadGatewayException({
                statusCode: HttpStatus.BAD_GATEWAY,
                code: 'VOLKSAI_UNREACHABLE',
                message: `VolksAI service is unreachable at ${endpoint}: ${error.message}. Please verify the service is running.`,
            });
        }

        const durationMs = Date.now() - startTime;

        if (!response.ok) {
            const responseText = await response.text();
            this.logger.error(
                `Bidding requirements analysis failed for tender ${tenderId}: HTTP ${response.status} - ${responseText}`,
            );

            if (
                response.status === HttpStatus.SERVICE_UNAVAILABLE ||
                responseText.includes('ANTHROPIC_API_KEY') ||
                responseText.includes('Claude') ||
                responseText.includes('credit_balance_too_low')
            ) {
                throw new ServiceUnavailableException({
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    code: 'LLM_UNAVAILABLE',
                    message: `Claude AI service is unavailable: ${responseText.slice(0, 200)}`,
                });
            }

            if (response.status === HttpStatus.GATEWAY_TIMEOUT || response.status === HttpStatus.REQUEST_TIMEOUT) {
                throw new GatewayTimeoutException({
                    statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    code: 'ANALYSIS_TIMEOUT',
                    message: `Bidding requirements analysis timed out in VolksAI: ${responseText.slice(0, 200)}`,
                });
            }

            throw new BadGatewayException({
                statusCode: HttpStatus.BAD_GATEWAY,
                code: 'ANALYSIS_FAILED',
                message: `Bidding requirements analysis failed with HTTP ${response.status}: ${responseText.slice(0, 200)}`,
            });
        }

        const result = (await response.json()) as VolksAiBiddingRequirementsResponse;

        this.logger.log(
            `Bidding requirements analysis complete for tender ${tenderId}: ${result.requirements?.length ?? 0} requirement(s) identified in ${durationMs}ms`,
        );

        const schemaVersion = Number(result.schemaVersion) || 0;
        if (schemaVersion < BIDDING_REQUIREMENTS_SCHEMA_VERSION) {
            this.logger.warn(
                `VolksAI returned bidding-requirements schemaVersion ${schemaVersion} for tender ${tenderId} ` +
                `(expected ${BIDDING_REQUIREMENTS_SCHEMA_VERSION}); it will be re-extracted on next request`,
            );
        }

        const analysisResult: BiddingRequirementsAnalysisResult = {
            jobId: result.job_id,
            requirements: result.requirements || [],
            llmUsage: result.llm_usage ?? null,
            schemaVersion,
            annexures: Array.isArray(result.annexures) ? result.annexures : [],
            rejectedAnnexures: Array.isArray(result.rejectedAnnexures) ? result.rejectedAnnexures : [],
            truncated: Boolean(result.truncated),
        };

        // Wire token usage tracking into claude_token_usage
        if (result.llm_usage) {
            try {
                const usage = result.llm_usage as Record<string, any>;
                const inputTokens = Number(usage.input_tokens || 0);
                const outputTokens = Number(usage.output_tokens || 0);
                const cacheCreationTokens = Number(usage.cache_creation_tokens || 0);
                const cacheReadTokens = Number(usage.cache_read_tokens || 0);
                const totalTokens =
                    Number(usage.total_tokens || 0) ||
                    inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
                const estimatedCostUsd = Number(usage.estimated_cost_usd || 0);
                // Do NOT change model names: store response.model; if absent store "unknown"
                const model = (usage.model as string) || (usage.role3_model as string) || 'unknown';

                await this.claudeUsageService.recordUsage({
                    userId,
                    tenderId,
                    jobId: result.job_id,
                    durationMs,
                    usage: {
                        stages: {
                            bidding_requirements: {
                                call_type: 'bidding_requirements',
                                model,
                                input_tokens: inputTokens,
                                output_tokens: outputTokens,
                                cache_creation_tokens: cacheCreationTokens,
                                cache_read_tokens: cacheReadTokens,
                                total_tokens: totalTokens,
                                estimated_cost_usd: estimatedCostUsd,
                                calls_count: 1,
                            },
                        },
                    },
                });
                this.logger.log(
                    `Recorded Claude token usage for bidding requirements on tender ${tenderId} (call_type: bidding_requirements, job: ${result.job_id})`,
                );
            } catch (usageErr: unknown) {
                this.logger.error(
                    `Failed to record Claude token usage for bidding requirements on tender ${tenderId}: ${(usageErr as Error).message}`,
                );
            }
        }

        return analysisResult;
    }

    /**
     * Persists analysis result into tender_extractions.fields.biddingRequirementsAnalysis.
     */
    private async cacheIntoTenderExtractions(
        tenderId: number,
        analysisResult: BiddingRequirementsAnalysisResult,
        durationMs: number,
        userId?: number,
    ): Promise<void> {
        try {
            const [existingExtraction] = await this.db
                .select()
                .from(tenderExtractions)
                .where(eq(tenderExtractions.tenderId, tenderId));

            const existingFields =
                existingExtraction?.fields && typeof existingExtraction.fields === 'object'
                    ? (existingExtraction.fields as Record<string, any>)
                    : {};

            const mergedFields = {
                ...existingFields,
                biddingRequirementsAnalysis: analysisResult,
            };

            await this.db
                .insert(tenderExtractions)
                .values({
                    tenderId,
                    fields: mergedFields,
                    missingFields: existingExtraction?.missingFields || [],
                    extractionVersion: existingExtraction?.extractionVersion || '1.0.0',
                    processingTimeMs: durationMs || existingExtraction?.processingTimeMs || null,
                    userId: userId || existingExtraction?.userId || null,
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: tenderExtractions.tenderId,
                    set: {
                        fields: sql`COALESCE(${tenderExtractions.fields}, '{}'::jsonb) || ${JSON.stringify({ biddingRequirementsAnalysis: analysisResult })}::jsonb`,
                        updatedAt: new Date(),
                        ...(userId ? { userId } : {}),
                    },
                });

            this.logger.log(
                `Cached bidding-requirements analysis into tender_extractions for tender ${tenderId}`,
            );
        } catch (dbErr: unknown) {
            this.logger.error(
                `Failed to cache bidding requirements into tender_extractions for tender ${tenderId}: ${(dbErr as Error).message}`,
            );
        }
    }

    /**
     * Read-only: the current cached analysis for this tender, or null when absent or older than
     * BIDDING_REQUIREMENTS_SCHEMA_VERSION.
     */
    async getCachedAnalysis(tenderId: number): Promise<BiddingRequirementsAnalysisResult | null> {
        await this.tenderInfosService.validateExists(tenderId);
        const [existingExtraction] = await this.db
            .select()
            .from(tenderExtractions)
            .where(eq(tenderExtractions.tenderId, tenderId));
        return this.readCurrentCache(existingExtraction?.fields, tenderId);
    }

    /**
     * Streams ONE cached annexure as a .docx.
     */
    async downloadAnnexureDocx(tenderId: number, annexureIndex: number): Promise<StreamableFile> {
        const tender = await this.tenderInfosService.validateExists(tenderId);

        const [existingExtraction] = await this.db
            .select()
            .from(tenderExtractions)
            .where(eq(tenderExtractions.tenderId, tenderId));

        const cached = this.readCurrentCache(existingExtraction?.fields, tenderId);
        if (!cached) {
            throw new NotFoundException(
                `No current bidding-requirements analysis for tender ${tenderId}; run the analysis before downloading annexures`,
            );
        }
        const annexure = cached.annexures[annexureIndex];
        if (!Number.isInteger(annexureIndex) || annexureIndex < 0 || !annexure) {
            throw new NotFoundException(
                `Annexure ${annexureIndex} not found for tender ${tenderId} (${cached.annexures.length} available)`,
            );
        }

        const endpoint = `${this.getServiceUrl()}/generate-annexure-docx`;
        const extractionFields = (existingExtraction?.fields as Record<string, any>) || {};
        const tenderNo = tender?.tenderNo || extractionFields.tender_number || extractionFields.gem_bid_number || '';
        const todayStr = new Date()
            .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replace(/\//g, '-');

        const context: Record<string, string> = {
            tenderNo,
            tenderName: tender?.tenderName || '',
            companyName: 'Volks Energie Private Limited',
            companyAddress: 'B-1/D8, 2nd floor, Mohan Cooperative Industrial Estate, New Delhi – 110044',
            place: 'New Delhi',
            date: todayStr,
            cin: 'U40100DL2011PTC228907',
            pan: 'AADCV9396C',
            msme: 'UDYAM-DL-090000465',
            email: 'contact@volksenergie.in',
            phone: '+91 9650393636',
            designation: 'Authorized Signatory',
        };

        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    annexureName: annexure.annexureName,
                    blocks: annexure.blocks,
                    context,
                }),
                signal: AbortSignal.timeout(30000),
            });
        } catch (err: unknown) {
            this.logger.error(`Failed to connect to VolksAI service at ${endpoint}: ${(err as Error).message}`);
            throw new BadGatewayException({
                statusCode: HttpStatus.BAD_GATEWAY,
                code: 'VOLKSAI_UNREACHABLE',
                message: `Failed to connect to VolksAI service at ${endpoint}: ${(err as Error).message}`,
            });
        }
        if (!response.ok) {
            const responseText = await response.text();
            this.logger.error(`Annexure .docx generation failed with HTTP ${response.status}: ${responseText}`);
            throw new BadGatewayException({
                statusCode: HttpStatus.BAD_GATEWAY,
                code: 'ANALYSIS_FAILED',
                message: `Annexure .docx generation failed with HTTP ${response.status}: ${responseText.slice(0, 200)}`,
            });
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const baseName = (annexure.annexureName || `annexure-${annexureIndex + 1}`)
            .replace(/[^A-Za-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || `annexure-${annexureIndex + 1}`;
        const filename = `tender${tenderId}_${baseName}.docx`;

        this.logger.log(`Serving annexure ${annexureIndex} ('${annexure.annexureName}') for tender ${tenderId} as ${filename}`);
        return new StreamableFile(buffer, {
            type: DOCX_MIME,
            disposition: `attachment; filename="${filename}"`,
            length: buffer.length,
        });
    }

    private readCurrentCache(fields: unknown, tenderId: number): BiddingRequirementsAnalysisResult | null {
        const cached =
            fields && typeof fields === 'object'
                ? (fields as Record<string, any>).biddingRequirementsAnalysis
                : null;
        if (!cached || typeof cached !== 'object') return null;

        const version = Number(cached.schemaVersion) || 0;
        if (version < BIDDING_REQUIREMENTS_SCHEMA_VERSION) {
            this.logger.log(
                `Ignoring stale bidding-requirements cache for tender ${tenderId} ` +
                `(schemaVersion ${cached.schemaVersion ?? 'missing'} < ${BIDDING_REQUIREMENTS_SCHEMA_VERSION})`,
            );
            return null;
        }
        return {
            jobId: cached.jobId || `cached_${tenderId}`,
            requirements: cached.requirements || [],
            llmUsage: cached.llmUsage ?? null,
            schemaVersion: version,
            annexures: Array.isArray(cached.annexures) ? cached.annexures : [],
            rejectedAnnexures: Array.isArray(cached.rejectedAnnexures) ? cached.rejectedAnnexures : [],
            truncated: Boolean(cached.truncated),
        };
    }

    private getServiceUrl(): string {
        const serviceUrl =
            this.configService.get<string>('volksAi.serviceUrl') ||
            this.configService.get<string>('volksAi.VOLKS_AI_SERVICE_URL') ||
            'http://localhost:8001';
        return serviceUrl.replace(/\/+$/, '');
    }

    private resolvePdfPath(pdfPath: string): string {
        if (path.isAbsolute(pdfPath)) return pdfPath;
        const uploadPath = this.fileUploadService.getAbsolutePath(pdfPath);
        if (fs.existsSync(uploadPath)) return uploadPath;
        return path.resolve(pdfPath);
    }

    private async buildLibraryDocuments(): Promise<{ id: string; document_name: string; document_type: string | null }[]> {
        // Master standard checklist documents (with unique 'std:' IDs)
        const docs: { id: string; document_name: string; document_type: string | null }[] = [
            ...STANDARD_CHECKLIST_DOCUMENTS.map((doc) => ({
                id: doc.id,
                document_name: doc.document_name,
                document_type: doc.document_type,
            })),
        ];

        const limit = 100;
        let page = 1;
        let totalPages = 1;

        do {
            const { data, meta } = await this.financeDocumentsService.findAll({ page, limit });
            for (const row of data) {
                docs.push({
                    id: String(row.id),
                    document_name: row.documentName || `Document ${row.id}`,
                    document_type: row.documentType != null ? String(row.documentType) : null,
                });
            }
            totalPages = meta.totalPages || 1;
            page += 1;
        } while (page <= totalPages);

        return docs;
    }
}
