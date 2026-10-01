import { AppLogger } from '@/logger/app-logger.service';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { ClaudeUsageService } from '@/modules/master/claude-usage/claude-usage.service';
import { FinanceDocumentsService } from '@/modules/shared/finance-documents/finance-documents.service';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { tenderExtractions } from '@db/schemas/tendering/tender-extractions.schema';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
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

export interface BiddingRequirementsAnalysisResult {
    jobId: string;
    requirements: SuggestedBiddingRequirement[];
    llmUsage: Record<string, unknown> | null;
    schemaVersion: number;
    annexures: SuggestedAnnexure[];
    rejectedAnnexures: { annexureName: string | null; reason: string }[];
    truncated: boolean;
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
 * and forwards both as multipart form data -- mirroring the existing
 * PdfExtractionProcessor -> VolksAI `/extract` integration pattern.
 */
@Injectable()
export class BiddingRequirementsService {
    private readonly logger;
    /**
     * In-process de-duplication: tenderId -> the analysis currently running for it. A second
     * request for the same tender (double-click, two tabs) awaits this promise and gets the
     * same result instead of dispatching its own VolksAI call.
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

    async analyzeForTender(
        tenderId: number,
        forceRefresh = false,
        userId?: number,
    ): Promise<BiddingRequirementsAnalysisResult> {
        const tender = await this.tenderInfosService.validateExists(tenderId);

        // STEP 2: Check cache in tender_extractions.fields before calling VolksAI
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

        // In-process: join an analysis already running for this tender. No await between this
        // check and the set below, so two concurrent requests can never both miss it.
        const running = this.inFlight.get(tenderId);
        if (running) {
            this.logger.log(`Joining in-flight bidding-requirements analysis for tender ${tenderId} (no second VolksAI dispatch)`);
            return running;
        }
        const run = this.runWithTenderLock(tenderId, () =>
            this.dispatchAnalysis(tenderId, tender, existingExtraction, forceRefresh, userId),
        );
        this.inFlight.set(tenderId, run);
        try {
            return await run;
        } finally {
            if (this.inFlight.get(tenderId) === run) this.inFlight.delete(tenderId);
        }
    }

    /**
     * Cross-process guard (only when Redis is connected): acquires the tender's lock and runs
     * `dispatch`; if another API process already holds it, waits for it to finish and returns
     * the analysis that process cached, instead of dispatching a second paid VolksAI call.
     * Without Redis this is a pass-through (the in-process map still de-duplicates).
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

    private async dispatchAnalysis(
        tenderId: number,
        tender: Awaited<ReturnType<TenderInfosService['validateExists']>>,
        existingExtraction: typeof tenderExtractions.$inferSelect | undefined,
        forceRefresh: boolean,
        userId: number | undefined,
    ): Promise<BiddingRequirementsAnalysisResult> {
        const resolvedDocs = this.tenderInfoSheetsService.resolveTenderDocuments(tender.documents);

        const mainPath = this.resolvePdfPath(resolvedDocs.mainTenderPath);
        if (!fs.existsSync(mainPath)) {
            throw new BadRequestException(
                `Tender main document not found at '${resolvedDocs.mainTenderPath}' (resolved to '${mainPath}')`,
            );
        }

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

        const serviceUrl =
            this.configService.get<string>('volksAi.serviceUrl') ||
            this.configService.get<string>('volksAi.VOLKS_AI_SERVICE_URL') ||
            'http://localhost:8001';
        // VOLKS_AI_TIMEOUT_MS is shared with /extract (120s default); this call must outlast
        // VolksAI's own Claude timeout (ANTHROPIC_ROLE3_TIMEOUT_S, 180s) plus PDF text/OCR time,
        // so it never waits less than BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS.
        const timeoutMs = Math.max(
            this.configService.get<number>('volksAi.timeoutMs') ||
                this.configService.get<number>('volksAi.VOLKS_AI_TIMEOUT_MS') ||
                120000,
            BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS,
        );

        const endpoint = `${serviceUrl.replace(/\/+$/, '')}/analyze-bidding-requirements`;
        this.logger.log(
            `Dispatching bidding-requirements analysis for tender ${tenderId} to ${endpoint} ` +
            `(${resolvedDocs.atcPaths.length} ATC file(s), ${libraryDocuments.length} library doc(s), forceRefresh: ${forceRefresh})`,
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
                throw new Error(
                    `Bidding requirements analysis timed out after ${timeoutMs}ms for tender ${tenderId} (URL: ${endpoint})`,
                );
            }
            throw new Error(`Failed to connect to VolksAI service at ${endpoint}: ${error.message}`);
        }

        const durationMs = Date.now() - startTime;

        if (!response.ok) {
            const responseText = await response.text();
            this.logger.error(
                `Bidding requirements analysis failed for tender ${tenderId}: HTTP ${response.status} - ${responseText}`,
            );
            throw new Error(`Bidding requirements analysis failed with HTTP ${response.status} (${response.statusText}): ${responseText}`);
        }

        const result = (await response.json()) as VolksAiBiddingRequirementsResponse;

        this.logger.log(
            `Bidding requirements analysis complete for tender ${tenderId}: ${result.requirements?.length ?? 0} requirement(s) identified in ${durationMs}ms`,
        );

        // A VolksAI build older than this code returns no schemaVersion; it is stored as 0 so
        // the next read treats it as stale instead of caching old-shape data as current.
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

        // STEP 1: Wire token usage tracking into claude_token_usage
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
                const model = (usage.model as string) || 'claude-sonnet-4-5-20250929';

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

        // STEP 2: Write result into tender_extractions.fields under 'biddingRequirementsAnalysis'
        try {
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

        return analysisResult;
    }

    /**
     * Read-only: the current cached analysis for this tender, or null when there is none
     * (or it is older than BIDDING_REQUIREMENTS_SCHEMA_VERSION). Never calls VolksAI, so the
     * checklist page can show an earlier result on load without starting a paid analysis.
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
     * Streams ONE cached annexure as a .docx. Reads the cached
     * tender_extractions.fields.biddingRequirementsAnalysis.annexures[annexureIndex] and asks
     * VolksAI's deterministic /generate-annexure-docx to render its stored blocks -- the
     * tender is not re-read and no Claude call is made. A missing/stale cache is a 404 (run
     * the analysis first) rather than an implicit, costly re-extraction from a GET download.
     */
    async downloadAnnexureDocx(tenderId: number, annexureIndex: number): Promise<StreamableFile> {
        await this.tenderInfosService.validateExists(tenderId);

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
        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ annexureName: annexure.annexureName, blocks: annexure.blocks }),
                signal: AbortSignal.timeout(30000),
            });
        } catch (err: unknown) {
            throw new Error(`Failed to connect to VolksAI service at ${endpoint}: ${(err as Error).message}`);
        }
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`Annexure .docx generation failed with HTTP ${response.status}: ${responseText}`);
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

    /**
     * The cached analysis, or null when absent or older than
     * BIDDING_REQUIREMENTS_SCHEMA_VERSION (so callers re-extract instead of serving an
     * old-shape entry, e.g. one cached before annexures existed).
     */
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

    /**
     * Pages through the entire finance_documents table (mirrors useFinanceDocumentsAll on
     * the web side) and maps each row into VolksAI's libraryDocuments shape. VolksAI holds
     * no database of its own -- this list is always built here and passed in.
     */
    private async buildLibraryDocuments(): Promise<{ id: string; document_name: string; document_type: string | null }[]> {
        const docs: { id: string; document_name: string; document_type: string | null }[] = [];
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
