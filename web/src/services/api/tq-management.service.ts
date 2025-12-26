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
    tqStatus?: TenderQueryStatus;
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
                search.set('tqStatus', filters.tqStatus);
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
        console.log('[TQ Management Service] createTqReceived called with data:', data);
        console.log('[TQ Management Service] Data validation:', {
            hasTenderId: !!data.tenderId,
            hasTqSubmissionDeadline: !!data.tqSubmissionDeadline,
            hasTqItems: Array.isArray(data.tqItems),
            tqItemsCount: data.tqItems?.length || 0,
            tqItems: data.tqItems,
        });

        try {
            console.log('[TQ Management Service] Making POST request to /received');
            const result = await this.post<TenderQuery>('/received', data);
            console.log('[TQ Management Service] POST request succeeded:', result);
            return result;
        } catch (error) {
            console.error('[TQ Management Service] POST request failed:', error);
            console.error('[TQ Management Service] Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                response: (error as any)?.response?.data,
                status: (error as any)?.response?.status,
                statusText: (error as any)?.response?.statusText,
            });
            throw error;
        }
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
