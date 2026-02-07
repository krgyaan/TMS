import { BaseApiService } from './base.service';
import type { TqManagementDashboardRow, CreateTqReceivedDto, UpdateTqRepliedDto, UpdateTqMissedDto, TqManagementDashboardCounts, } from '@/modules/tendering/tq-management/helpers/tqManagement.types';
import type { TabKey, TqManagementFilters, TenderQuery } from '@/modules/tendering/tq-management/helpers/tqManagement.types';
import type { PaginatedResult } from '@/types/api.types';

class TqManagementService extends BaseApiService {
    constructor() {
        super('/tq-management');
    }

    async getDashboard(
        tabKey?: TabKey,
        filters?: TqManagementFilters,
    ): Promise<PaginatedResult<TqManagementDashboardRow>> {
        const search = new URLSearchParams();

        if (tabKey) {
            search.set('tabKey', tabKey);
        }
        if (filters) {
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
            if (filters.search) {
                search.set('search', filters.search);
            }
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TqManagementDashboardRow>>(`/dashboard${queryString ? `?${queryString}` : ''}`);
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
        console.log('Creating TQ received:', data);
        console.log('this:', this);
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

    async getDashboardCounts(teamId?: number): Promise<TqManagementDashboardCounts> {
        const params = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            params.append('teamId', teamId.toString());
        }
        const query = params.toString();
        return this.get<TqManagementDashboardCounts>(query ? `/dashboard/counts?${query}` : '/dashboard/counts');
    }
}

export const tqManagementService =
    new TqManagementService();
