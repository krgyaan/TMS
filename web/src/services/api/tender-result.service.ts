import type { ResultDashboardFilters } from '@/modules/tendering/results/helpers/tenderResult.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { ResultDashboardRow } from '@/modules/tendering/results/helpers/tenderResult.types';
import type { TenderResult } from '@/modules/tendering/results/helpers/tenderResult.types';
import type { UploadResultFormPageProps } from '@/modules/tendering/results/helpers/tenderResult.types';
import type { ResultDashboardCounts } from '@/modules/tendering/results/helpers/tenderResult.types';
class TenderResultService extends BaseApiService {
    constructor() {
        super('/tender-results');
    }

    async getAll(params?: ResultDashboardFilters): Promise<PaginatedResult<ResultDashboardRow>> {
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
            if (params.teamId !== undefined && params.teamId !== null) {
                search.set('teamId', params.teamId.toString());
            }
        }

        const queryString = search.toString();
        const url = `/dashboard${queryString ? `?${queryString}` : ''}`;

        try {
            const result = await this.get<PaginatedResult<ResultDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('error:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<TenderResult> {
        return this.get<TenderResult>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<TenderResult | null> {
        return this.get<TenderResult>(`/tender/${tenderId}`);
    }

    async getRaDetails(id: number): Promise<any | null> {
        return this.get<any>(`/${id}/ra-details`);
    }

    async uploadResult(id: number, data: UploadResultFormPageProps): Promise<TenderResult> {
        return this.post<TenderResult>(`/${id}/upload-result`, data);
    }

    async uploadResultByTenderId(tenderId: number, data: any): Promise<TenderResult> {
        return this.post<TenderResult>(`/upload/${tenderId}`, data);
    }

    async getCounts(teamId?: number): Promise<ResultDashboardCounts> {
        try {
            const params = new URLSearchParams();
            if (teamId !== undefined && teamId !== null) {
                params.append('teamId', teamId.toString());
            }
            const query = params.toString();
            const result = await this.get<ResultDashboardCounts>(query ? `/dashboard/counts?${query}` : '/dashboard/counts');
            return result;
        } catch (error) {
            console.error('error:', error);
            throw error;
        }
    }
}

export const tenderResultService = new TenderResultService();
