import { BaseApiService } from './base.service';
import type {
    TenderQuery,
    TqManagementDashboardRow,
    CreateTqReceivedDto,
    UpdateTqRepliedDto,
    UpdateTqMissedDto,
    PaginatedResult,
    TqManagementDashboardCounts,
    TenderQueryStatus,
} from '@/types/api.types';

export type TqManagementFilters = {
    tqStatus?: TenderQueryStatus | TenderQueryStatus[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

class TqManagementService extends BaseApiService {
    constructor() {
        super('/tq-management');
    }

    async getAll(
        filters?: TqManagementFilters
    ): Promise<PaginatedResult<TqManagementDashboardRow>> {
        const search = new URLSearchParams();

        if (filters) {
            if (filters.tqStatus) {
                // Only handle single status in service - arrays are handled in hook
                const status = Array.isArray(filters.tqStatus) ? filters.tqStatus[0] : filters.tqStatus;
                search.set('tqStatus', status);
            }
            if (filters.page) {
                search.set('page', String(filters.page));
            }
            if (filters.limit) {
                search.set('limit', String(filters.limit));
            }
            if (filters.sortBy) {
                search.set('sortBy', filters.sortBy);
            }
            if (filters.sortOrder) {
                search.set('sortOrder', filters.sortOrder);
            }
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TqManagementDashboardRow>>(
            queryString ? `?${queryString}` : ''
        );
    }

    async getById(id: number): Promise<TenderQuery> {
        return this.get<TenderQuery>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<TenderQuery[]> {
        return this.get<TenderQuery[]>(`/tender/${tenderId}`);
    }

    async getTqItems(id: number): Promise<any[]> {
        return this.get<any[]>(`/${id}/items`);
    }

    async createTqReceived(data: CreateTqReceivedDto): Promise<TenderQuery> {
        return this.post<TenderQuery>('/received', data);
    }

    async updateTqReceived(id: number, data: CreateTqReceivedDto): Promise<TenderQuery> {
        return this.patch<TenderQuery>(`/${id}/received`, data);
    }

    async updateTqReplied(id: number, data: UpdateTqRepliedDto): Promise<TenderQuery> {
        return this.patch<TenderQuery>(`/${id}/replied`, data);
    }

    async updateTqMissed(id: number, data: UpdateTqMissedDto): Promise<TenderQuery> {
        return this.patch<TenderQuery>(`/${id}/missed`, data);
    }

    async markAsNoTq(tenderId: number, qualified: boolean = true): Promise<TenderQuery> {
        return this.post<TenderQuery>('/no-tq', { tenderId, qualified });
    }

    async tqQualified(tqId: number, qualified: boolean = true): Promise<TenderQuery> {
        return this.patch<TenderQuery>(`/${tqId}/qualified`, { qualified });
    }

    async getDashboardCounts(): Promise<TqManagementDashboardCounts> {
        return this.get<TqManagementDashboardCounts>('/counts');
    }
}

export const tqManagementService =
    new TqManagementService();
