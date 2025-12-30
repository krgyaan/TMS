import type { ResultDashboardFilters } from '@/hooks/api/useTenderResults';
import { BaseApiService } from './base.service';
import type { PaginatedResult, ResultDashboardCounts, ResultDashboardRow, TenderResult, UploadResultDto } from '@/types/api.types';

class TenderResultService extends BaseApiService {
    constructor() {
        super('/tender-results');
    }

    async getAll(params?: ResultDashboardFilters): Promise<PaginatedResult<ResultDashboardRow>> {
        const search = new URLSearchParams();
        console.log('=== tenderResultService.getAll ===');
        console.log('params:', params);

        // Map type to tab for dashboard endpoint
        const tabMap: Record<string, string> = {
            'pending': 'result-awaited',
            'won': 'won',
            'lost': 'lost',
            'disqualified': 'disqualified',
        };

        if (params) {
            if (params.type !== undefined) {
                search.set('tab', tabMap[params.type] || params.type);
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
        const url = `/dashboard${queryString ? `?${queryString}` : ''}`;
        console.log('Request URL:', url);
        console.log('Full URL:', `${this.basePath}${url}`);

        try {
            const result = await this.get<PaginatedResult<ResultDashboardRow>>(url);
            console.log('=== tenderResultService.getAll Response ===');
            console.log('result:', result);
            console.log('result.data:', result?.data);
            console.log('result.meta:', result?.meta);
            console.log('result.data length:', result?.data?.length);
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

    async uploadResult(id: number, data: UploadResultDto): Promise<TenderResult> {
        return this.patch<TenderResult>(`/${id}/upload-result`, data);
    }

    async getCounts(): Promise<ResultDashboardCounts> {
        console.log('=== tenderResultService.getCounts ===');
        console.log('Request URL: /dashboard/counts');
        console.log('Full URL:', `${this.basePath}/dashboard/counts`);

        try {
            const result = await this.get<ResultDashboardCounts>('/dashboard/counts');
            console.log('=== tenderResultService.getCounts Response ===');
            console.log('result:', result);
            console.log('result.pending:', result?.pending);
            console.log('result.won:', result?.won);
            console.log('result.lost:', result?.lost);
            console.log('result.disqualified:', result?.disqualified);
            console.log('result.total:', result?.total);
            return result;
        } catch (error) {
            console.error('=== tenderResultService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }
}

export const tenderResultService = new TenderResultService();
