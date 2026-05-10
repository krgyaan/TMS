import type { BankTransferDashboardFilters, BankTransferActionFormData, BankTransferFollowupData } from '@/modules/bi-dashboard/bank-tranfer/helpers/bankTransfer.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { BankTransferDashboardRow } from '@/modules/bi-dashboard/bank-tranfer/helpers/bankTransfer.types';
import type { BankTransferDashboardCounts } from '@/modules/bi-dashboard/bank-tranfer/helpers/bankTransfer.types';

class BankTransfersService extends BaseApiService {
    constructor() {
        super('/bank-transfers');
    }

    async getAll(params?: BankTransferDashboardFilters): Promise<PaginatedResult<BankTransferDashboardRow>> {
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
            const result = await this.get<PaginatedResult<BankTransferDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('=== bankTransfersService.getAll Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getCounts(): Promise<BankTransferDashboardCounts> {
        try {
            const result = await this.get<BankTransferDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('=== bankTransfersService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<any> {
        try {
            const result = await this.get<any>(`/requests/${id}`);
            return result;
        } catch (error) {
            console.error('=== bankTransfersService.getById Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getActionFormData(id: number): Promise<BankTransferActionFormData> {
        try {
            const result = await this.get<BankTransferActionFormData>(`/instruments/${id}/action-form`);
            return result;
        } catch (error) {
            console.error('=== bankTransfersService.getActionFormData Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getFollowupData(id: number): Promise<BankTransferFollowupData | null> {
        try {
            const result = await this.get<BankTransferFollowupData | null>(`/instruments/${id}/followup`);
            return result;
        } catch (error) {
            console.error('=== bankTransfersService.getFollowupData Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async updateAction(id: number, formData: FormData): Promise<any> {
        console.log('Action Form Data:', formData);
        return this.patch<any, FormData>(`/instruments/${id}/action`, formData);
    }
}

export const bankTransfersService = new BankTransfersService();
