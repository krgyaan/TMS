import { BaseApiService } from './base.service';
import axiosInstance from '@/lib/axios';
import type {
    DocumentChecklistsDashboardCounts,
    TenderDocumentChecklist,
    TenderDocumentChecklistDashboardRow,
    CreateDocumentChecklistDto,
    UpdateDocumentChecklistDto,
    BiddingRequirementsAnalysisResult,
    CachedBiddingRequirementsResponse,
    BiddingRequirementsJobStatusResponse,
} from '@/modules/tendering/checklists/helpers/documentChecklist.types';
import type { PaginatedResult } from '@/types/api.types';

/**
 * Per-request timeout for the bidding-requirements analysis only (the global axios
 * timeout stays 30s). The call runs one full-document Sonnet pass and routinely takes
 * 80-100s+; at 30s the browser gave up while the API kept going, and the user's retry
 * started a second paid analysis. It must outlast the API's own wait for VolksAI
 * (BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS = 240s, which covers VolksAI's 180s Claude timeout
 * plus PDF text extraction), so: 240s + 30s headroom. Node's default server
 * requestTimeout (300s) is above this.
 */
export const BIDDING_REQUIREMENTS_REQUEST_TIMEOUT_MS = 270_000;

export type DocumentChecklistListParams = {
    tab?: 'pending' | 'submitted' | 'tender-dnb';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

class DocumentChecklistService extends BaseApiService {
    constructor() {
        super('/document-checklists');
    }

    async getAll(params?: DocumentChecklistListParams, teamId?: number): Promise<PaginatedResult<TenderDocumentChecklistDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.tab) {
                search.set('tab', String(params.tab));
            }
            if (params.page) {
                search.set('page', String(params.page));
            }
            if (params.limit) {
                search.set('limit', String(params.limit));
            }
            if (params.sortBy) {
                search.set('sortBy', params.sortBy);
            }
            if (params.sortOrder) {
                search.set('sortOrder', params.sortOrder);
            }
            if (params.search) {
                search.set('search', params.search);
            }
        }
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TenderDocumentChecklistDashboardRow>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getDashboardCounts(teamId?: number): Promise<DocumentChecklistsDashboardCounts> {
        const search = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }
        const queryString = search.toString();
        return this.get<DocumentChecklistsDashboardCounts>(queryString ? `/dashboard/counts?${queryString}` : '/dashboard/counts');
    }

    async getByTenderId(tenderId: number): Promise<TenderDocumentChecklist | null> {
        return this.get<TenderDocumentChecklist>(`/tender/${tenderId}`);
    }

    /**
     * Starts an asynchronous AI analysis job for bidding requirements (POST).
     * Returns immediately with job status without waiting for the slow LLM call.
     */
    async startSuggestedRequirements(
        tenderId: number,
        forceRefresh = false,
    ): Promise<BiddingRequirementsJobStatusResponse> {
        return this.post<BiddingRequirementsJobStatusResponse>(
            `/tender/${tenderId}/bidding-requirements${forceRefresh ? '?forceRefresh=true' : ''}`,
            { forceRefresh },
        );
    }

    /**
     * Polls the status of an ongoing or completed bidding requirements job.
     */
    async getSuggestedRequirementsStatus(
        tenderId: number,
    ): Promise<BiddingRequirementsJobStatusResponse> {
        return this.get<BiddingRequirementsJobStatusResponse>(
            `/tender/${tenderId}/bidding-requirements/status`,
        );
    }

    /**
     * AI-suggested bidding requirements for this tender.
     * Uses POST to initiate an async job (idempotent per tender + document hash)
     * and polls the status endpoint until done or failed.
     * Prevents long-lived HTTP requests and proxy/client timeouts.
     * Supports cancellation signal on page unmount and configurable max wait.
     */
    async getSuggestedRequirements(
        tenderId: number,
        forceRefresh = false,
        options?: {
            signal?: AbortSignal;
            pollIntervalMs?: number;
            maxWaitMs?: number;
        },
    ): Promise<BiddingRequirementsAnalysisResult> {
        const signal = options?.signal;
        const pollIntervalMs = options?.pollIntervalMs ?? 2000;
        const maxWaitMs = options?.maxWaitMs ?? 300_000;

        if (signal?.aborted) {
            throw new DOMException('Bidding requirements request aborted', 'AbortError');
        }

        // 1. Start or join existing job via POST (returns immediately)
        const initialStatus = await this.startSuggestedRequirements(tenderId, forceRefresh);

        if (initialStatus.status === 'done' && initialStatus.analysis) {
            return initialStatus.analysis;
        }

        if (initialStatus.status === 'failed') {
            const err: any = new Error(initialStatus.error?.message || 'Bidding requirements analysis failed');
            err.response = { data: initialStatus.error };
            throw err;
        }

        // 2. Poll status endpoint until done, failed, timed out, or unmounted
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            if (signal?.aborted) {
                throw new DOMException('Bidding requirements polling aborted on page unmount', 'AbortError');
            }

            // Await pollIntervalMs with cancellation listener
            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => {
                    if (signal) signal.removeEventListener('abort', onAbort);
                    resolve();
                }, pollIntervalMs);

                const onAbort = () => {
                    clearTimeout(timer);
                    reject(new DOMException('Bidding requirements polling aborted on page unmount', 'AbortError'));
                };

                if (signal) {
                    signal.addEventListener('abort', onAbort, { once: true });
                }
            });

            if (signal?.aborted) {
                throw new DOMException('Bidding requirements polling aborted on page unmount', 'AbortError');
            }

            const currentStatus = await this.getSuggestedRequirementsStatus(tenderId);

            if (currentStatus.status === 'done' && currentStatus.analysis) {
                return currentStatus.analysis;
            }

            if (currentStatus.status === 'failed') {
                const err: any = new Error(currentStatus.error?.message || 'Bidding requirements analysis failed');
                err.response = { data: currentStatus.error };
                throw err;
            }
        }

        const timeoutErr: any = new Error(
            'Bidding requirements analysis timed out while waiting for background job to finish',
        );
        timeoutErr.response = {
            data: {
                code: 'ANALYSIS_TIMEOUT',
                message: 'Bidding requirements analysis timed out. The document may be too large.',
            },
        };
        throw timeoutErr;
    }

    /**
     * Cache-only read (never runs VolksAI): the tender's current cached analysis, or null
     * if it has never been analysed. Fast, so it uses the normal request timeout.
     */
    async getCachedRequirements(tenderId: number): Promise<BiddingRequirementsAnalysisResult | null> {
        const res = await this.get<CachedBiddingRequirementsResponse>(`/tender/${tenderId}/bidding-requirements/cached`);
        return res?.analysis ?? null;
    }

    /**
     * Downloads ONE annexure (by its index in the cached analysis's `annexures[]`) as a .docx.
     * Returns the blob plus the server-chosen filename for the caller to save.
     */
    async downloadAnnexure(tenderId: number, annexureIndex: number): Promise<{ blob: Blob; filename: string }> {
        const response = await axiosInstance.get<Blob>(
            `${this.basePath}/tender/${tenderId}/annexures/${annexureIndex}/download`,
            { responseType: 'blob' },
        );
        const disposition = String(response.headers?.['content-disposition'] ?? '');
        const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? `tender${tenderId}_annexure-${annexureIndex + 1}.docx`;
        return { blob: response.data, filename };
    }

    async create(data: CreateDocumentChecklistDto): Promise<TenderDocumentChecklist> {
        return this.post<TenderDocumentChecklist>('', data);
    }

    async update(data: UpdateDocumentChecklistDto): Promise<TenderDocumentChecklist> {
        const { id, ...updateData } = data;
        return this.patch<TenderDocumentChecklist>(`/${id}`, updateData);
    }
}

export const documentChecklistService =
    new DocumentChecklistService();
