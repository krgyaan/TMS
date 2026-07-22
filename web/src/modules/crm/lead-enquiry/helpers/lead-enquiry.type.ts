export interface LeadEnquiry {
    id: number;
    leadId: number | null;
    team: string | null;
    enqName: string;
    organisationId: number | null;
    itemId: number;
    locationCode: string;
    approxValue: string;
    siteVisitRequired: boolean;
    createdBy: number;
    updatedBy: number | null;
    orgAbbName: string | null;
    enquiryFile: string | null;
    enquiryPhotos: string | null;
    organizationName: string | null;
    enquiryNumber: string | null;
    rejectionReason: string | null;
    status: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeadEnquiryWithNames extends LeadEnquiry {
    leadName?: string | null;
    itemName?: string | null;
    orgName?: string | null;
    createdByName?: string | null;
    updatedByName?: string | null;
}

export interface CreateLeadEnquiryRequest {
    leadId?: number | null;
    team?: string | null;
    enqName: string;
    organisationId?: number | null;
    itemId: number;
    locationCode: string;
    approxValue: string;
    siteVisitRequired?: boolean;
    orgAbbName?: string | null;
    enquiryFile?: string | null;
    enquiryPhotos?: string | null;
    organizationName?: string | null;
    enquiryNumber?: string | null;
    rejectionReason?: string | null;
    status?: string | null;
    notes?: string | null;
}

export interface UpdateLeadEnquiryRequest extends Partial<CreateLeadEnquiryRequest> {}

export interface LeadEnquiryListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
