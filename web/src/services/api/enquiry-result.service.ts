import { BaseApiService } from "./base.service";
import type { PaginatedResult } from "@/types/api.types";
import type { EnquiryResultWithDetails, EnquiryResult, EnquiryResultListParams, CreateEnquiryResultRequest, UpdateEnquiryResultRequest } from "@/modules/crm/enquiry-result/helpers/enquiry-result.type";

class EnquiryResultService extends BaseApiService {
    constructor() {
        super('/enquiry-results');
    }

    async getAll(params?: EnquiryResultListParams): Promise<PaginatedResult<EnquiryResultWithDetails>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.enquiryId) search.set('enquiryId', String(params.enquiryId));
        if (params?.status) search.set('status', params.status);
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        const qs = search.toString();
        return this.get<PaginatedResult<EnquiryResultWithDetails>>(qs ? `?${qs}` : '');
    }

    async getById(id: number): Promise<EnquiryResultWithDetails> {
        return this.get<EnquiryResultWithDetails>(`/${id}`);
    }

    async create(data: CreateEnquiryResultRequest): Promise<EnquiryResult> {
        return this.post<EnquiryResult>('/', data);
    }

    async update(id: number, data: UpdateEnquiryResultRequest): Promise<EnquiryResult> {
        return this.patch<EnquiryResult>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const enquiryResultService = new EnquiryResultService();
