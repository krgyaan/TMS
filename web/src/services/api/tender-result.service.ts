import type { ResultDashboardFilters } from '@/hooks/api/useTenderResults';
import { BaseApiService } from './base.service';
import type { PaginatedResult, ResultDashboardRow, TenderResult, UploadResultDto } from '@/types/api.types';

class TenderResultService extends BaseApiService {
    constructor() {
        super('/tender-results');
    }

    async getAll(params?: ResultDashboardFilters): Promise<PaginatedResult<ResultDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.type !== undefined) {
                search.set('type', params.type);
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
        return this.get<PaginatedResult<ResultDashboardRow>>(queryString ? `?${queryString}` : '');
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

    async uploadResult(id: number, data: UploadResultDto): Promise<TenderResult> {
        return this.patch<TenderResult>(`/${id}/upload-result`, data);
    }
}

export const tenderResultService = new TenderResultService();
