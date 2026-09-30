import { AppLogger } from '@/logger/app-logger.service';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { ClaudeUsageService } from '@/modules/master/claude-usage/claude-usage.service';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { tenderDocumentChecklists, type ExtraDocument } from '@db/schemas/tendering/tender-document-checklists.schema';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// Same upload context the checklist form uses for extra_documents (CompactFileUploader context="checklists").
const ANNEXURE_UPLOAD_CONTEXT = 'checklists' as const;
// "<job_id>/<file>.docx" exactly as VolksAI's /identify-annexures returns it.
const VOLKS_AI_DOCX_PATH_RE = /^[A-Za-z0-9_\-.]+\/[A-Za-z0-9_\-.]+\.docx$/;

export interface AnnexureSource {
    document: 'main' | 'atc';
    page: number;
    snippet: string;
}

export interface IdentifiedAnnexure {
    annexureName: string;
    source: AnnexureSource;
    /** Relative upload path (`checklists/{fileName}`), servable via GET /files/serve/checklists/:fileName. */
    path: string;
}

export interface AnnexureIdentificationResult {
    jobId: string;
    annexures: IdentifiedAnnexure[];
    rejected: { annexureName: string | null; reason: string }[];
    truncated: boolean;
    /**
     * True when the annexures were appended to an existing tender_document_checklists row.
     * False when no checklist row exists yet: files are saved but no row is created, because
     * a row's existence is what marks the checklist "submitted" on the dashboard (and the
     * normal create() path also sends the submission email and stops the timer). The caller
     * should include `annexures` in extraDocuments when the checklist form is submitted.
     */
    appendedToChecklist: boolean;
    llmUsage: Record<string, unknown> | null;
}

interface VolksAiAnnexuresResponse {
    job_id: string;
    annexures: { annexureName: string; source: AnnexureSource; docxPath: string; downloadUrl: string }[];
    rejected: { annexureName: string | null; reason: string }[];
    truncated: boolean;
    llm_usage: Record<string, unknown> | null;
}

/**
 * Bridges document-checklist annexure generation to VolksAI's `/identify-annexures`
 * (Role 4): resolves the tender's main + ATC PDFs exactly as BiddingRequirementsService
 * does, forwards them as multipart form data, fetches each generated .docx from
 * VolksAI's `/annexure-files/...` route, re-saves it under uploads via FileUploadService,
 * and appends `{ name, path }` entries to tender_document_checklists.extra_documents.
 */
@Injectable()
export class TenderAnnexuresService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly configService: ConfigService,
        private readonly fileUploadService: FileUploadService,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderInfoSheetsService: TenderInfoSheetsService,
        private readonly claudeUsageService: ClaudeUsageService,
    ) {
        this.logger = this.appLogger.withContext(TenderAnnexuresService.name);
    }

    async identifyAnnexuresForTender(tenderId: number, userId?: number): Promise<AnnexureIdentificationResult> {
        const tender = await this.tenderInfosService.validateExists(tenderId);
        const resolvedDocs = this.tenderInfoSheetsService.resolveTenderDocuments(tender.documents);

        const mainPath = this.resolvePdfPath(resolvedDocs.mainTenderPath);
        if (!fs.existsSync(mainPath)) {
            throw new BadRequestException(
                `Tender main document not found at '${resolvedDocs.mainTenderPath}' (resolved to '${mainPath}')`,
            );
        }

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

        const serviceUrl = this.getServiceUrl();
        const timeoutMs =
            this.configService.get<number>('volksAi.timeoutMs') ||
            this.configService.get<number>('volksAi.VOLKS_AI_TIMEOUT_MS') ||
            120000;

        const endpoint = `${serviceUrl}/identify-annexures`;
        this.logger.log(
            `Dispatching annexure identification for tender ${tenderId} to ${endpoint} (${resolvedDocs.atcPaths.length} ATC file(s))`,
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
                    `Annexure identification timed out after ${timeoutMs}ms for tender ${tenderId} (URL: ${endpoint})`,
                );
            }
            throw new Error(`Failed to connect to VolksAI service at ${endpoint}: ${error.message}`);
        }
        const durationMs = Date.now() - startTime;

        if (!response.ok) {
            const responseText = await response.text();
            this.logger.error(`Annexure identification failed for tender ${tenderId}: HTTP ${response.status} - ${responseText}`);
            throw new Error(`Annexure identification failed with HTTP ${response.status} (${response.statusText}): ${responseText}`);
        }

        const result = (await response.json()) as VolksAiAnnexuresResponse;
        const returned = result.annexures || [];
        this.logger.log(
            `Annexure identification complete for tender ${tenderId}: ${returned.length} annexure(s), ` +
            `${result.rejected?.length ?? 0} rejected, in ${durationMs}ms`,
        );

        await this.recordUsage(result, tenderId, userId, durationMs);

        // Fetch + save every file before touching the DB, so a failed download never
        // leaves a half-appended extra_documents list.
        const saved: IdentifiedAnnexure[] = [];
        try {
            for (const annexure of returned) {
                const savedPath = await this.fetchAndSaveDocx(serviceUrl, annexure.docxPath, tenderId);
                saved.push({ annexureName: annexure.annexureName, source: annexure.source, path: savedPath });
            }
        } catch (err) {
            await this.deleteSaved(saved);
            throw err;
        }

        let appendedToChecklist = false;
        if (saved.length > 0) {
            try {
                appendedToChecklist = await this.appendExtraDocuments(
                    tenderId,
                    saved.map(a => ({ name: a.annexureName, path: a.path })),
                );
            } catch (err) {
                await this.deleteSaved(saved);
                throw err;
            }
            if (!appendedToChecklist) {
                this.logger.warn(
                    `No document checklist row exists yet for tender ${tenderId}; saved ${saved.length} annexure file(s) ` +
                    `without creating one (creating a row would mark the checklist as submitted)`,
                );
            }
        }

        return {
            jobId: result.job_id,
            annexures: saved,
            rejected: result.rejected || [],
            truncated: Boolean(result.truncated),
            appendedToChecklist,
            llmUsage: result.llm_usage ?? null,
        };
    }

    /**
     * Atomic jsonb array append: `COALESCE(extra_documents, '[]') || $new`, evaluated in
     * Postgres, so existing entries (and any written concurrently) are preserved -- never a
     * read-modify-write overwrite. Returns false if the tender has no checklist row.
     */
    private async appendExtraDocuments(tenderId: number, entries: ExtraDocument[]): Promise<boolean> {
        const updated = await this.db
            .update(tenderDocumentChecklists)
            .set({
                extraDocuments: sql`COALESCE(${tenderDocumentChecklists.extraDocuments}, '[]'::jsonb) || ${JSON.stringify(entries)}::jsonb`,
                updatedAt: new Date(),
            })
            .where(eq(tenderDocumentChecklists.tenderId, tenderId))
            .returning({ id: tenderDocumentChecklists.id });
        return updated.length > 0;
    }

    private async fetchAndSaveDocx(serviceUrl: string, docxPath: string, tenderId: number): Promise<string> {
        if (!VOLKS_AI_DOCX_PATH_RE.test(docxPath || '')) {
            throw new Error(`VolksAI returned an invalid annexure docxPath: '${docxPath}'`);
        }
        const url = `${serviceUrl}/annexure-files/${docxPath}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) {
            throw new Error(`Failed to fetch generated annexure '${docxPath}' from VolksAI: HTTP ${res.status}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const saved = await this.fileUploadService.saveBuffer(
            buffer,
            ANNEXURE_UPLOAD_CONTEXT,
            `tender${tenderId}_${path.basename(docxPath)}`,
            DOCX_MIME,
        );
        return saved.path;
    }

    private async deleteSaved(saved: IdentifiedAnnexure[]): Promise<void> {
        for (const a of saved) {
            try {
                await this.fileUploadService.delete(a.path);
            } catch (err) {
                this.logger.warn(`Could not clean up annexure file '${a.path}': ${(err as Error).message}`);
            }
        }
    }

    private async recordUsage(result: VolksAiAnnexuresResponse, tenderId: number, userId: number | undefined, durationMs: number) {
        if (!result.llm_usage) return;
        try {
            const usage = result.llm_usage as Record<string, any>;
            const inputTokens = Number(usage.input_tokens || 0);
            const outputTokens = Number(usage.output_tokens || 0);
            const cacheCreationTokens = Number(usage.cache_creation_tokens || 0);
            const cacheReadTokens = Number(usage.cache_read_tokens || 0);
            await this.claudeUsageService.recordUsage({
                userId,
                tenderId,
                jobId: result.job_id,
                durationMs,
                usage: {
                    stages: {
                        annexure_identification: {
                            call_type: 'annexure_identification',
                            model: (usage.model as string) || 'claude-sonnet-5',
                            input_tokens: inputTokens,
                            output_tokens: outputTokens,
                            cache_creation_tokens: cacheCreationTokens,
                            cache_read_tokens: cacheReadTokens,
                            total_tokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens,
                            estimated_cost_usd: Number(usage.estimated_cost_usd || 0),
                            calls_count: 1,
                        },
                    },
                },
            });
        } catch (usageErr: unknown) {
            this.logger.error(
                `Failed to record Claude token usage for annexure identification on tender ${tenderId}: ${(usageErr as Error).message}`,
            );
        }
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
}
