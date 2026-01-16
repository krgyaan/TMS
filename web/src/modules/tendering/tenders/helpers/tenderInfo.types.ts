export interface TenderInfo {
    id: number;
    team: number;
    tenderNo: string;
    organization: number | null;
    tenderName: string;
    item: number;
    gstValues: string;
    tenderFees: string;
    emd: string;
    teamMember: number | null;
    dueDate: Date | string;
    remarks: string | null;
    status: number;
    location: number | null;
    website: number | null;
    courierAddress: string | null;
    deleteStatus: number;
    documents: string | null;

    // Tender approval fields
    tlRemarks: string | null;
    rfqTo: string | null;
    tlStatus: number;
    tenderFeeMode: string | null; // ✅ Added
    emdMode: string | null; // ✅ Added
    approvePqrSelection: string | null;
    approveFinanceDocSelection: string | null;
    tenderApprovalStatus: string | null;
    tlRejectionRemarks: string | null;
    oemNotAllowed: string | null;

    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface TenderInfoWithNames extends TenderInfo {
    organizationName?: string | null;
    organizationAcronym?: string | null;
    teamMemberName?: string | null;
    teamMemberUsername?: string | null;
    statusName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
    locationState?: string | null;
    websiteName?: string | null;
    websiteLink?: string | null;
    oemExperience?: string | null;
}

export interface CreateTenderRequest {
    team: number;
    tenderNo: string;
    organization?: number | null;
    tenderName: string;
    item: number;
    gstValues?: string;
    tenderFees?: string;
    emd?: string;
    teamMember?: number | null;
    dueDate: Date | string;
    remarks?: string | null;
    status?: number;
    location?: number | null;
    website?: number | null;
    courierAddress?: string | null;
}

export interface UpdateTenderRequest {
    team?: number;
    tenderNo?: string;
    organization?: number | null;
    tenderName?: string;
    item?: number;
    gstValues?: string;
    tenderFees?: string;
    emd?: string;
    teamMember?: number | null;
    dueDate?: Date | string;
    remarks?: string | null;
    status?: number;
    location?: number | null;
    website?: number | null;
    courierAddress?: string | null;
    tlRemarks?: string | null;
    rfqTo?: string | null;
    tlStatus?: number;
    tenderFeeMode?: string | null;
    emdMode?: string | null;
    approvePqrSelection?: string | null;
    approveFinanceDocSelection?: string | null;
    tenderApprovalStatus?: string | null;
    tlRejectionRemarks?: string | null;
    oemNotAllowed?: string | null;
}
