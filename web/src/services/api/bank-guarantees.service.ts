import type { BankGuaranteeDashboardFilters } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { BankGuaranteeDashboardRow } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import type { BankGuaranteeDashboardCounts, BankGuaranteeCardStats } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';

class BankGuaranteesService extends BaseApiService {
    constructor() {
        super('/bank-guarantees');
    }

    async getAll(params?: BankGuaranteeDashboardFilters): Promise<PaginatedResult<BankGuaranteeDashboardRow>> {
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
            const result = await this.get<PaginatedResult<BankGuaranteeDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('error:', error);
            throw error;
        }
    }

    async getCounts(): Promise<BankGuaranteeDashboardCounts> {
        try {
            const result = await this.get<BankGuaranteeDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('error:', error);
            throw error;
        }
    }

    async getCardStats(): Promise<BankGuaranteeCardStats> {
        try {
            const result = await this.get<BankGuaranteeCardStats>('/dashboard/card-stats');
            return result;
        } catch (error) {
            console.error('error:', error);
            throw error;
        }
    }

    async updateAction(id: number, formData: FormData): Promise<any> {
        return this.put<any, FormData>(`/instruments/${id}/action`, formData);
    }
}

export const bankGuaranteesService = new BankGuaranteesService();
