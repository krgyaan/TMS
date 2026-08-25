export interface LeadEnquiry {
    id: number;
    leadId: number | null;
    happyCallingId: number | null;
    tenderId: number | null;
    team: string | null;
    enqName: string;
    organisationId: number | null;
    itemId: number;
    locationCode: string;
    approxValue: string;
    dueDate: string | null;
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
    enquiryType: string | null;
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
    teamName?: string | null;
    hasSiteVisit?: boolean;
    tenderStatusId?: number | null;
    tenderStatusName?: string | null;
    latestFollowupType?: string | null;
    nextFollowupDate?: string | null;
    lastFollowupAt?: string | null;
    tenderStage?: string | null;
    contacts?: EnquiryContact[] | null;
}

export interface EnquiryContact {
    name: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface CreateLeadEnquiryRequest {
    leadId?: number | null;
    happyCallingId?: number | null;
    team?: string | null;
    enqName: string;
    organisationId?: number | null;
    itemId: number;
    locationCode: string;
    approxValue: string;
    dueDate?: string | null;
    siteVisitRequired?: boolean;
    orgAbbName?: string | null;
    enquiryFile?: string | null;
    enquiryPhotos?: string | null;
    organizationName?: string | null;
    enquiryNumber?: string | null;
    rejectionReason?: string | null;
    status?: string | null;
    enquiryType?: string | null;
    notes?: string | null;
    contacts?: EnquiryContact[] | null;
}

export type UpdateLeadEnquiryRequest = Partial<CreateLeadEnquiryRequest>;

export interface CreateEnquiryWithLeadRequest {
    team?: string | null;
    enqName: string;
    organisationId?: number | null;
    itemId: number;
    locationCode: string;
    approxValue: string;
    dueDate?: string | null;
    siteVisitRequired?: boolean;
    orgAbbName?: string | null;
    enquiryFile?: string | null;
    enquiryPhotos?: string | null;
    organizationName: string;
    enquiryNumber?: string | null;
    rejectionReason?: string | null;
    status?: string | null;
    enquiryType?: string | null;
    notes?: string | null;
    contacts: EnquiryContact[];
    address?: string | null;
    country?: string | null;
    state?: string | null;
}

export interface SiteVisitContact {
    id: number;
    siteVisitId: number;
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSiteVisitContactRequest {
    name: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface UpdateSiteVisitDetailsRequest {
    information?: string | null;
    documents?: string | null;
    conductedAt?: string | null;
}

export interface LeadEnquiryListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    team?: string;
    leadId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface SiteVisit {
    id: number;
    enquiryId: number;
    assignedTo: number | null;
    assignedToName: string | null;
    scheduledAt: string | null;
    conductedAt: string | null;
    information: string | null;
    additionalNotes: string | null;
    documents: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSiteVisitRequest {
    enquiryId: number;
    assignedTo?: number | null;
    scheduledAt?: string | null;
    information?: string | null;
    additionalNotes?: string | null;
    documents?: string | null;
}

export interface UpdateSiteVisitRequest {
    assignedTo?: number | null;
    scheduledAt?: string | null;
    conductedAt?: string | null;
    information?: string | null;
    additionalNotes?: string | null;
    documents?: string | null;
    status?: string;
}
