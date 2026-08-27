import { BaseApiService } from './base.service';
import type { LeadEnquiry, LeadEnquiryWithNames, CreateLeadEnquiryRequest, UpdateLeadEnquiryRequest, LeadEnquiryListParams, SiteVisit, CreateSiteVisitRequest, UpdateSiteVisitRequest, SiteVisitContact, CreateSiteVisitContactRequest, UpdateSiteVisitDetailsRequest, CreateEnquiryWithLeadRequest } from '@/modules/crm/lead-enquiry/helpers/lead-enquiry.type';
import type { PaginatedResult } from '@/types/api.types';

class LeadEnquiryService extends BaseApiService {
    constructor() { super('/lead-enquiries'); }

    async getAll(params?: LeadEnquiryListParams): Promise<PaginatedResult<LeadEnquiryWithNames>> {
        const search = new URLSearchParams();
        if (params) {
            if (params.page)      search.set('page',      String(params.page));
            if (params.limit)     search.set('limit',     String(params.limit));
            if (params.search)    search.set('search',    params.search);
            if (params.status)    search.set('status',    params.status);
            if (params.team)      search.set('team',      params.team);
            if (params.leadId)    search.set('leadId',    String(params.leadId));
            if (params.happyCallingId) search.set('happyCallingId', String(params.happyCallingId));
            if (params.sortBy)    search.set('sortBy',    params.sortBy);
            if (params.sortOrder) search.set('sortOrder', params.sortOrder);
        }
        const qs = search.toString();
        return this.get<PaginatedResult<LeadEnquiryWithNames>>(qs ? `?${qs}` : '');
    }

    async getById(id: number): Promise<LeadEnquiryWithNames> {
        return this.get<LeadEnquiryWithNames>(`/${id}`);
    }

    async create(data: CreateLeadEnquiryRequest): Promise<LeadEnquiry> {
        return this.post<LeadEnquiry>('', data);
    }

    async createWithLead(data: CreateEnquiryWithLeadRequest): Promise<{ lead: { id: number }; enquiry: LeadEnquiry }> {
        return this.post<{ lead: { id: number }; enquiry: LeadEnquiry }>('/with-lead', data);
    }

    async update(id: number, data: UpdateLeadEnquiryRequest): Promise<LeadEnquiry> {
        return this.patch<LeadEnquiry>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async createSiteVisit(data: CreateSiteVisitRequest): Promise<SiteVisit> {
        return this.post<SiteVisit>('/site-visits', data);
    }

    async getSiteVisitsByEnquiry(enquiryId: number): Promise<SiteVisit[]> {
        return this.get<SiteVisit[]>(`/site-visits/enquiry/${enquiryId}`);
    }

    async getFirstSiteVisitByEnquiry(enquiryId: number): Promise<SiteVisit | null> {
        return this.get<SiteVisit | null>(`/site-visits/first/${enquiryId}`);
    }

    async getSiteVisitsByLead(leadId: number): Promise<SiteVisit[]> {
        return this.get<SiteVisit[]>(`/site-visits/by-lead/${leadId}`);
    }

    async getSiteVisitsByHappyCalling(happyCallingId: number): Promise<SiteVisit[]> {
        return this.get<SiteVisit[]>(`/site-visits/by-happy-calling/${happyCallingId}`);
    }

    async updateSiteVisit(id: number, data: UpdateSiteVisitRequest): Promise<SiteVisit> {
        return this.patch<SiteVisit>(`/site-visits/${id}`, data);
    }

    async updateSiteVisitDetails(id: number, data: UpdateSiteVisitDetailsRequest): Promise<SiteVisit> {
        return this.patch<SiteVisit>(`/site-visits/details/${id}`, data);
    }

    async uploadSiteVisitDocs(siteVisitId: number, filenames: string[]): Promise<string[]> {
        const res = await this.post<{ filenames: string[] }>(`/site-visits/${siteVisitId}/upload-docs`, { filenames });
        return res.filenames;
    }

    async getSiteVisitContacts(siteVisitId: number): Promise<SiteVisitContact[]> {
        return this.get<SiteVisitContact[]>(`/site-visits/contacts/${siteVisitId}`);
    }

    async createSiteVisitContacts(siteVisitId: number, contacts: CreateSiteVisitContactRequest[]): Promise<SiteVisitContact[]> {
        return this.post<SiteVisitContact[]>('/site-visits/contacts/bulk', { siteVisitId, contacts });
    }
}

export const leadEnquiryService = new LeadEnquiryService();
