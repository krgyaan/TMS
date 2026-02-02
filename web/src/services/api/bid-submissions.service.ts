import { BaseApiService } from './base.service';
import type {
    BidSubmission,
    BidSubmissionDashboardCounts,
    BidSubmissionListParams,
    BidSubmissionDashboardRow,
    SubmitBidDto,
    MarkAsMissedDto,
    UpdateBidSubmissionDto,
} from '@/modules/tendering/bid-submissions/helpers/bidSubmission.types';
import type { PaginatedResult } from '@/types/api.types';


class BidSubmissionsService extends BaseApiService {
    constructor() {
        super('/bid-submissions');
    }

    async getAll(params?: BidSubmissionListParams): Promise<PaginatedResult<BidSubmissionDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.tab) {
                search.set('tab', params.tab);
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

        const queryString = search.toString();
        return this.get<PaginatedResult<BidSubmissionDashboardRow>>(`/dashboard${queryString ? `?${queryString}` : ''}`);
    }

    async getById(id: number): Promise<BidSubmission> {
        return this.get<BidSubmission>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<BidSubmission | null> {
        return this.get<BidSubmission>(`/tender/${tenderId}`);
    }

    async submitBid(data: SubmitBidDto): Promise<BidSubmission> {
        return this.post<BidSubmission>('/submit', data);
    }

    async markAsMissed(data: MarkAsMissedDto): Promise<BidSubmission> {
        return this.post<BidSubmission>('/missed', data);
    }

    async update(id: number, data: UpdateBidSubmissionDto): Promise<BidSubmission> {
        return this.patch<BidSubmission>(`/${id}`, data);
    }

    async getDashboardCounts(): Promise<BidSubmissionDashboardCounts> {
        return this.get<BidSubmissionDashboardCounts>('/dashboard/counts');
    }
}

export const bidSubmissionsService = new BidSubmissionsService();
