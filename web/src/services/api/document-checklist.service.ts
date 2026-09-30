import { BaseApiService } from './base.service';
import type {
    DocumentChecklistsDashboardCounts,
    TenderDocumentChecklist,
    TenderDocumentChecklistDashboardRow,
    CreateDocumentChecklistDto,
    UpdateDocumentChecklistDto,
    BiddingRequirementsAnalysisResult,
    CachedBiddingRequirementsResponse,
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
     * AI-suggested bidding requirements for this tender (VolksAI analysis of the
     * tender's main + ATC documents, bridged through the API). Read-only.
     */
    async getSuggestedRequirements(tenderId: number, forceRefresh = false): Promise<BiddingRequirementsAnalysisResult> {
        // forceRefresh=true bypasses the API cache and runs a new (paid) analysis.
        const query = forceRefresh ? '?forceRefresh=true' : '';
        return this.get<BiddingRequirementsAnalysisResult>(`/tender/${tenderId}/bidding-requirements${query}`, {
            timeout: BIDDING_REQUIREMENTS_REQUEST_TIMEOUT_MS,
        });
    }

    /**
     * Cache-only read (never runs VolksAI): the tender's current cached analysis, or null
     * if it has never been analysed. Fast, so it uses the normal request timeout.
     */
    async getCachedRequirements(tenderId: number): Promise<BiddingRequirementsAnalysisResult | null> {
        const res = await this.get<CachedBiddingRequirementsResponse>(`/tender/${tenderId}/bidding-requirements/cached`);
        return res?.analysis ?? null;
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
