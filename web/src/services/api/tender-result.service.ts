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
        console.log('=== tenderResultService.getAll ===');
        console.log('params:', params);

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
        const url = `/dashboard${queryString ? `?${queryString}` : ''}`;

        try {
            const result = await this.get<PaginatedResult<ResultDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('=== tenderResultService.getAll Error ===');
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

    async getCounts(): Promise<ResultDashboardCounts> {
        try {
            const result = await this.get<ResultDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('=== tenderResultService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }
}

export const tenderResultService = new TenderResultService();
