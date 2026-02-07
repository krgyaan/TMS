import type { DemandDraftDashboardFilters } from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { DemandDraftDashboardRow } from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';
import type { DemandDraftDashboardCounts } from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';

class DemandDraftsService extends BaseApiService {
    constructor() {
        super('/demand-drafts');
    }

    async getAll(params?: DemandDraftDashboardFilters): Promise<PaginatedResult<DemandDraftDashboardRow>> {
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
            const result = await this.get<PaginatedResult<DemandDraftDashboardRow>>(url);
            return result;
        } catch (error) {
            console.error('=== demandDraftsService.getAll Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getCounts(): Promise<DemandDraftDashboardCounts> {
        try {
            const result = await this.get<DemandDraftDashboardCounts>('/dashboard/counts');
            return result;
        } catch (error) {
            console.error('=== demandDraftsService.getCounts Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<any> {
        try {
            const result = await this.get<any>(`/requests/${id}`);
            return result;
        } catch (error) {
            console.error('=== demandDraftsService.getById Error ===');
            console.error('error:', error);
            throw error;
        }
    }

    async updateAction(id: number, formData: FormData): Promise<any> {
        return this.put<any, FormData>(`/instruments/${id}/action`, formData);
    }
}

export const demandDraftsService = new DemandDraftsService();
