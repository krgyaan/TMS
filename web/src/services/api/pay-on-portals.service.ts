import type { PayOnPortalDashboardFilters } from '@/modules/bi-dashboard/pay-on-portal/helpers/payOnPortal.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { PayOnPortalDashboardRow } from '@/modules/bi-dashboard/pay-on-portal/helpers/payOnPortal.types';
import type { PayOnPortalDashboardCounts } from '@/modules/bi-dashboard/pay-on-portal/helpers/payOnPortal.types';

class PayOnPortalsService extends BaseApiService {
    constructor() {
        super('/pay-on-portals');
    }

    async getAll(params?: PayOnPortalDashboardFilters): Promise<PaginatedResult<PayOnPortalDashboardRow>> {
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
            const result = await this.get<PaginatedResult<PayOnPortalDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('=== payOnPortalsService.getAll Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getCounts(): Promise<PayOnPortalDashboardCounts> {
        try {
            const result = await this.get<PayOnPortalDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('=== payOnPortalsService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<any> {
        try {
            const result = await this.get<any>(`/requests/${id}`);
            return result;
        } catch (error) {
            console.error('=== payOnPortalsService.getById Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async updateAction(id: number, formData: FormData): Promise<any> {
        return this.put<any, FormData>(`/instruments/${id}/action`, formData);
    }
}

export const payOnPortalsService = new PayOnPortalsService();
