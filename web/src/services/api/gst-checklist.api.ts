import type { PaginatedResponse } from '@/types/api.types';
import { BaseApiService } from './base.service';
import type { ChecklistListParams } from './tds-checklist.api';

export interface GstChecklistRow {
    id: number;
    projectName: string | null;
    poNumber: string | null;
    invoiceNo: string | null;
    partyName: string | null;
    category: string | null;
    invoiceValue: string | null;
    gstAmount: string;
    invoiceDate: string;
}

class GstChecklistApiService extends BaseApiService {
    constructor() {
        super('/accounts/gst-checklists');
    }

    async getAll(params: ChecklistListParams = {}): Promise<PaginatedResponse<GstChecklistRow>> {
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
        return this.get<PaginatedResponse<GstChecklistRow>>(queryString ? `?${queryString}` : '');
    }
}

export const gstChecklistApi = new GstChecklistApiService();