import { BaseApiService } from './base.service';
import type { EnquiryCosting, EnquiryCostingListParams, SubmitCostingSheetRequest, SubmitCostingSheetResponse } from '@/modules/crm/enquirycosting/helpers/enquirycosting.type';
import type { PaginatedResult } from '@/types/api.types';

class EnquiryCostingService extends BaseApiService {
    constructor() { super('/enquiry-costings'); }

    async getAll(params?: EnquiryCostingListParams): Promise<PaginatedResult<EnquiryCosting>> {
        const search = new URLSearchParams();
        if (params) {
            if (params.page)      search.set('page',      String(params.page));
            if (params.limit)     search.set('limit',     String(params.limit));
            if (params.search)    search.set('search',    params.search);
            if (params.status)    search.set('status',    params.status);
            if (params.sortBy)    search.set('sortBy',    params.sortBy);
            if (params.sortOrder) search.set('sortOrder', params.sortOrder);
        }
        const qs = search.toString();
        return this.get<PaginatedResult<EnquiryCosting>>(qs ? `?${qs}` : '');
    }

    async getById(id: number): Promise<EnquiryCosting> {
        return this.get<EnquiryCosting>(`/${id}`);
    }

    async submitCostingSheet(data: SubmitCostingSheetRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>('/submit-costing-sheet', data);
    }
}

export const enquiryCostingService = new EnquiryCostingService();
