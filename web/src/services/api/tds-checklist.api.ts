import type { PaginatedResponse } from '@/types/api.types';
import { BaseApiService } from './base.service';

export interface ChecklistListParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface TdsChecklistRow {
    id: number;
    projectName: string | null;
    poNumber: string | null;
    partyName: string | null;
    sellerName: string | null;
    amount: string | null;
    tdsAmount: string;
    tdsReturnDate: string;
    invoiceDate: string | null;
}

class TdsChecklistApiService extends BaseApiService {
    constructor() {
        super('/accounts/tds-checklists');
    }

    async getAll(params: ChecklistListParams = {}): Promise<PaginatedResponse<TdsChecklistRow>> {
        const search = new URLSearchParams();

        if (params.page) {
            search.set('page', String(params.page));
        }
        if (params.limit) {
            search.set('limit', String(params.limit));
        }
        if (params.search) {
            search.set('search', params.search);
        }
        if (params.sortBy) {
            search.set('sortBy', params.sortBy);
        }
        if (params.sortOrder) {
            search.set('sortOrder', params.sortOrder);
        }

        const queryString = search.toString();
        return this.get<PaginatedResponse<TdsChecklistRow>>(queryString ? `?${queryString}` : '');
    }
}

export const tdsChecklistApi = new TdsChecklistApiService();