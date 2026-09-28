import { AppLogger } from '@/logger/app-logger.service';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { ClaudeUsageService } from '@/modules/master/claude-usage/claude-usage.service';
import { FinanceDocumentsService } from '@/modules/shared/finance-documents/finance-documents.service';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { tenderExtractions } from '@db/schemas/tendering/tender-extractions.schema';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

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

export interface BiddingRequirementsAnalysisResult {
    jobId: string;
    requirements: SuggestedBiddingRequirement[];
    llmUsage: Record<string, unknown> | null;
}

interface VolksAiBiddingRequirementsResponse {
    job_id: string;
    requirements: SuggestedBiddingRequirement[];
    llm_usage: Record<string, unknown> | null;
}

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

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly configService: ConfigService,
        private readonly fileUploadService: FileUploadService,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderInfoSheetsService: TenderInfoSheetsService,
        private readonly financeDocumentsService: FinanceDocumentsService,
        private readonly claudeUsageService: ClaudeUsageService,
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

        const cachedAnalysis =
            existingExtraction?.fields &&
            typeof existingExtraction.fields === 'object' &&
            (existingExtraction.fields as Record<string, any>).biddingRequirementsAnalysis;

        if (!forceRefresh && cachedAnalysis) {
            this.logger.log(
                `Returning cached bidding-requirements analysis for tender ${tenderId} ` +
                `(${cachedAnalysis.requirements?.length ?? 0} requirement(s))`,
            );
            return {
                jobId: cachedAnalysis.jobId || `cached_${tenderId}`,
                requirements: cachedAnalysis.requirements || [],
                llmUsage: cachedAnalysis.llmUsage ?? null,
            };
        }

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
        const timeoutMs =
            this.configService.get<number>('volksAi.timeoutMs') ||
            this.configService.get<number>('volksAi.VOLKS_AI_TIMEOUT_MS') ||
            120000;

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

        const analysisResult: BiddingRequirementsAnalysisResult = {
            jobId: result.job_id,
            requirements: result.requirements || [],
            llmUsage: result.llm_usage ?? null,
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
