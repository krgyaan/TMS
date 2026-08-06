export interface PrivateQuote {
    id: number;
    enquiryId: number;
    quoteSubmissionDatetime: string | null;
    submittedDocuments: string | null;
    contacts: ContactEntry[] | null;
    missedReason: string | null;
    oemName: string | null;
    oemVendorId: number | null;
    preventRepeat: string | null;
    tmsImprovement: string | null;
    status: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    enquiryNumber: string | null;
    enqName: string | null;
    approxValue: string | null;
    organizationName: string | null;
    finalPrice: string | null;
    approvedFinalPrice: string | null;
    sheetUrl: string | null;
}

export interface ContactEntry {
    name: string;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface LeadsQuotationListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    enquiryId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface UpdatePrivateQuoteRequest {
    quoteSubmissionDatetime?: string | null;
    submittedDocuments?: string | null;
    contacts?: ContactEntry[] | string | null;
    missedReason?: string | null;
    oemName?: string | null;
    oemVendorId?: number | null;
    preventRepeat?: string | null;
    tmsImprovement?: string | null;
    status?: string | null;
}
