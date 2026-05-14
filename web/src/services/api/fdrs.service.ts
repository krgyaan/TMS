import type { DashboardFilters } from '@/modules/bi-dashboard/fdr/helpers/fdr.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { FdrDashboardRow } from '@/modules/bi-dashboard/fdr/helpers/fdr.types';
import type { FdrDashboardCounts } from '@/modules/bi-dashboard/fdr/helpers/fdr.types';

class FdrsService extends BaseApiService {
    constructor() {
        super('/fdrs');
    }

    async getAll(params?: DashboardFilters): Promise<PaginatedResult<FdrDashboardRow>> {
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
            const result = await this.get<PaginatedResult<FdrDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('=== fdrsService.getAll Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getCounts(): Promise<FdrDashboardCounts> {
        try {
            const result = await this.get<FdrDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('=== fdrsService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<any> {
        try {
            const result = await this.get<any>(`/requests/${id}`);
            return result;
        } catch (error) {
            console.error('=== fdrsService.getById Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getActionFormData(id: number): Promise<any> {
        return this.get<any>(`/instruments/${id}/action-form`);
    }

    async getFollowupData(id: number): Promise<any> {
        return this.get<any>(`/instruments/${id}/followup`);
    }

    async updateAction(id: number, data: any): Promise<any> {
        return this.patch<any>(`/instruments/${id}/action`, data);
    }
}

export const fdrsService = new FdrsService();
