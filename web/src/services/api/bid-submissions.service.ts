import { BaseApiService } from './base.service';
import type {
    BidSubmission,
    PaginatedResult,
    BidSubmissionDashboardCounts,
    BidSubmissionListParams,
    BidSubmissionDashboardRow,
    SubmitBidDto,
    MarkAsMissedDto,
    UpdateBidSubmissionDto,
} from '@/types/api.types';


class BidSubmissionsService extends BaseApiService {
    constructor() {
        super('/bid-submissions');
    }

    async getAll(params?: BidSubmissionListParams): Promise<PaginatedResult<BidSubmissionDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.bidStatus) {
                search.set('bidStatus', params.bidStatus);
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
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<BidSubmissionDashboardRow>>(queryString ? `?${queryString}` : '');
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
        return this.get<BidSubmissionDashboardCounts>('/counts');
    }
}

export const bidSubmissionsService = new BidSubmissionsService();
