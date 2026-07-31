export interface EnquiryResult {
    id: number;
    enquiryId: number;
    technicallyQualified?: boolean | null;
    disqualificationReason?: string | null;
    qualifiedCount?: number | null;
    qualifiedParties?: string[] | null;
    result?: string | null;
    l1Price?: string | null;
    l2Price?: string | null;
    ourPrice?: string | null;
    uploadScreenshot?: string | null;
    uploadDocuments?: string | null;
    status?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface EnquiryResultWithDetails extends EnquiryResult {
    enquiryNumber?: string | null;
    enqName?: string | null;
    organizationName?: string | null;
    team?: string | null;
    createdByName?: string | null;
    itemName?: string | null;
    quoteSubmissionDatetime?: string | null;
    finalPrice?: string | null;
    approvedFinalPrice?: string | null;
    quotationId?: number | null;
    contacts?: QuotationContact[];
}

export interface QuotationContact {
    name: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface EnquiryResultListParams {
    page?: number;
    limit?: number;
    enquiryId?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateEnquiryResultRequest {
    enquiryId: number;
    technicallyQualified?: boolean | null;
    disqualificationReason?: string | null;
    qualifiedCount?: number | null;
    qualifiedParties?: string[] | null;
    result?: string | null;
    l1Price?: number | null;
    l2Price?: number | null;
    ourPrice?: number | null;
    uploadScreenshot?: string | null;
    uploadDocuments?: string | null;
    status?: string | null;
}

export interface UpdateEnquiryResultRequest {
    technicallyQualified?: boolean | null;
    disqualificationReason?: string | null;
    qualifiedCount?: number | null;
    qualifiedParties?: string[] | null;
    result?: string | null;
    l1Price?: number | null;
    l2Price?: number | null;
    ourPrice?: number | null;
    uploadScreenshot?: string | null;
    uploadDocuments?: string | null;
    status?: string | null;
}

export interface CreateEnquiryFollowupContact {
    name: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface CreateEnquiryFollowupRequest {
    organisation_name: string;
    contacts: CreateEnquiryFollowupContact[];
    followup_start_date?: string;
    frequency?: number;
    emailBody?: string;
    attachments?: string[];
}
