import { BaseApiService } from "./base.service";
import type { PaginatedResult } from "@/types/api.types";
import type { PrivateQuote, LeadsQuotationListParams, UpdatePrivateQuoteRequest, ContactEntry } from "@/modules/crm/leads-quotation/helpers/leads-quotation.type";

class LeadsQuotationService extends BaseApiService {
    constructor() {
        super('/leads-quotations');
    }

    async getAll(params?: LeadsQuotationListParams): Promise<PaginatedResult<PrivateQuote>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.search) search.set('search', params.search);
        if (params?.status) search.set('status', params.status);
        if (params?.enquiryId) search.set('enquiryId', String(params.enquiryId));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        const qs = search.toString();
        return this.get<PaginatedResult<PrivateQuote>>(qs ? `?${qs}` : '');
    }

    async getById(id: number): Promise<PrivateQuote> {
        return this.get<PrivateQuote>(`/${id}`);
    }

    async getByLeadId(leadId: number): Promise<PrivateQuote[]> {
        return this.get<PrivateQuote[]>(`/by-lead/${leadId}`);
    }

    async update(id: number, data: UpdatePrivateQuoteRequest): Promise<PrivateQuote> {
        return this.patch<PrivateQuote>(`/${id}`, data);
    }

    async uploadDocs(quoteId: number, filenames: string[]): Promise<string[]> {
        const res = await this.post<{ filenames: string[] }>(`/${quoteId}/upload-docs`, { filenames });
        return res.filenames;
    }
}

export const leadsQuotationService = new LeadsQuotationService();
