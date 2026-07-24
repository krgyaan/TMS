import { BaseApiService } from './base.service';
import type { LeadEnquiry, LeadEnquiryWithNames, CreateLeadEnquiryRequest, UpdateLeadEnquiryRequest, LeadEnquiryListParams, SiteVisit, CreateSiteVisitRequest, UpdateSiteVisitRequest, SiteVisitContact, CreateSiteVisitContactRequest, UpdateSiteVisitDetailsRequest, CreateCostingSheetResponse, SubmitCostingSheetRequest, SubmitCostingSheetResponse, DriveScopesResponse } from '@/modules/crm/lead-enquiry/helpers/lead-enquiry.type';
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

    async updateSiteVisit(id: number, data: UpdateSiteVisitRequest): Promise<SiteVisit> {
        return this.patch<SiteVisit>(`/site-visits/${id}`, data);
    }

    async updateSiteVisitDetails(id: number, data: UpdateSiteVisitDetailsRequest): Promise<SiteVisit> {
        return this.patch<SiteVisit>(`/site-visits/details/${id}`, data);
    }

    async getSiteVisitContacts(siteVisitId: number): Promise<SiteVisitContact[]> {
        return this.get<SiteVisitContact[]>(`/site-visits/contacts/${siteVisitId}`);
    }

    async createSiteVisitContacts(siteVisitId: number, contacts: CreateSiteVisitContactRequest[]): Promise<SiteVisitContact[]> {
        return this.post<SiteVisitContact[]>('/site-visits/contacts/bulk', { siteVisitId, contacts });
    }

    async checkDriveScopes(): Promise<DriveScopesResponse> {
        return this.get<DriveScopesResponse>('/check-drive-scopes');
    }

    async createCostingSheet(enquiryId: number): Promise<CreateCostingSheetResponse> {
        return this.post<CreateCostingSheetResponse>('/create-costing-sheet', { enquiryId });
    }

    async submitCostingSheet(data: SubmitCostingSheetRequest): Promise<SubmitCostingSheetResponse> {
        return this.post<SubmitCostingSheetResponse>('/submit-costing-sheet', data);
    }
}

export const leadEnquiryService = new LeadEnquiryService();
