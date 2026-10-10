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

export interface GstChecklistSummary {
    totalInvoiceValue: number;
    totalGstAmount: number;
}

export type GstChecklistListResponse = PaginatedResponse<GstChecklistRow> & {
    summary: GstChecklistSummary;
};

class GstChecklistApiService extends BaseApiService {
    constructor() {
        super('/accounts/gst-checklists');
    }

    async getAll(params: ChecklistListParams = {}): Promise<GstChecklistListResponse> {
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
        if (params.year) {
            search.set('year', String(params.year));
        }
        if (params.month) {
            search.set('month', String(params.month));
        }

        const queryString = search.toString();
        return this.get<GstChecklistListResponse>(queryString ? `?${queryString}` : '');
    }
}

export const gstChecklistApi = new GstChecklistApiService();