import { BaseApiService } from './base.service';
import type { EnquiryCosting, EnquiryCostingListParams, SubmitCostingSheetRequest, SubmitCostingSheetResponse, ResubmitCostingSheetRequest, ApproveCostingSheetRequest, RedoCostingSheetRequest, RejectEnquiryRequest } from '@/modules/crm/enquirycosting/helpers/enquirycosting.type';
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

    async getByEnquiryId(enquiryId: number): Promise<EnquiryCosting | null> {
        return this.get<EnquiryCosting | null>(`/by-enquiry/${enquiryId}`);
    }

    async submitCostingSheet(data: SubmitCostingSheetRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>('/submit-costing-sheet', data);
    }

    async resubmitCostingSheet(data: ResubmitCostingSheetRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>('/resubmit-costing-sheet', data);
    }

    async approveCosting(id: number, data: ApproveCostingSheetRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>(`/${id}/approve`, data);
    }

    async redoCosting(id: number, data: RedoCostingSheetRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>(`/${id}/redo`, data);
    }

    async rejectEnquiry(id: number, data: RejectEnquiryRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>(`/${id}/reject`, data);
    }
}

export const enquiryCostingService = new EnquiryCostingService();
