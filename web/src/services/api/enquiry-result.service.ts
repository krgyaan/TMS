import { BaseApiService } from "./base.service";
import type { PaginatedResult } from "@/types/api.types";
import type { EnquiryResultWithDetails, EnquiryResult, EnquiryResultListParams, CreateEnquiryResultRequest, UpdateEnquiryResultRequest, CreateEnquiryFollowupRequest } from "@/modules/crm/enquiry-result/helpers/enquiry-result.type";

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

    async getStatusSummary(): Promise<Record<string, number>> {
        return this.get<Record<string, number>>('/status-summary');
    }

    async getByLeadId(leadId: number): Promise<EnquiryResultWithDetails[]> {
        return this.get<EnquiryResultWithDetails[]>(`/by-lead/${leadId}`);
    }

    async getByHappyCallingId(happyCallingId: number): Promise<EnquiryResultWithDetails[]> {
        return this.get<EnquiryResultWithDetails[]>(`/by-happy-calling/${happyCallingId}`);
    }

    async getFollowupsByQuotation(quotationId: number): Promise<any[]> {
        return this.get<any[]>(`/followups-by-quotation/${quotationId}`);
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

    async uploadScreenshots(id: number, files: File[]): Promise<string[]> {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await this.post<{ filenames: string[] }>(`/${id}/upload-screenshots`, formData);
        return res.filenames;
    }

    async uploadDocuments(id: number, files: File[]): Promise<string[]> {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await this.post<{ filenames: string[] }>(`/${id}/upload-documents`, formData);
        return res.filenames;
    }

    async createFollowup(id: number, data: CreateEnquiryFollowupRequest): Promise<unknown> {
        return this.post<unknown>(`/${id}/followup`, data);
    }
}

export const enquiryResultService = new EnquiryResultService();
