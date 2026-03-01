import type { ChequeDashboardFilters } from '@/modules/bi-dashboard/cheque/helpers/cheque.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { ChequeDashboardRow } from '@/modules/bi-dashboard/cheque/helpers/cheque.types';
import type { ChequeDashboardCounts } from '@/modules/bi-dashboard/cheque/helpers/cheque.types';

class ChequesService extends BaseApiService {
    constructor() {
        super('/cheques');
    }

    async getAll(params?: ChequeDashboardFilters): Promise<PaginatedResult<ChequeDashboardRow>> {
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
        const url = `/dashboard${queryString ? `?${queryString}` : ''}`;

        try {
            const result = await this.get<PaginatedResult<ChequeDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('=== chequesService.getAll Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getCounts(): Promise<ChequeDashboardCounts> {
        try {
            const result = await this.get<ChequeDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('=== chequesService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<any> {
        try {
            const result = await this.get<any>(`/requests/${id}`);
            return result;
        } catch (error) {
            console.error('=== chequesService.getById Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async updateAction(id: number, formData: FormData): Promise<any> {
        return this.put<any, FormData>(`/instruments/${id}/action`, formData);
    }
}

export const chequesService = new ChequesService();
