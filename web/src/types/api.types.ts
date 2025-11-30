// Tender Info Sheet Types
export interface TenderClient {
    id?: number;
    clientName: string;
    clientDesignation?: string | null;
    clientMobile?: string | null;
    clientEmail?: string | null;
}

// Base Tender Info (matches tenderInfos table)
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
    teamMember: number;
    dueDate: Date | string;
    remarks: string | null;
    status: number;
    location: number | null;
    website: number | null;
    courierAddress: string | null;
    deleteStatus: number;

    // Tender approval fields
    tlRemarks: string | null;
    rfqTo: string | null;
    tlStatus: number;
    tenderFeeMode: string | null;  // ✅ Added
    emdMode: string | null;        // ✅ Added
    approvePqrSelection: string | null;
    approveFinanceDocSelection: string | null;
    tenderApprovalStatus: string | null;
    tlRejectionRemarks: string | null;
    oemNotAllowed: string | null;

    createdAt: Date | string;
    updatedAt: Date | string;
}

// Tender with joined relation names
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
}

// Create/Update DTOs
export interface CreateTenderRequest {
    team: number;
    tenderNo: string;
    organization?: number | null;
    tenderName: string;
    item: number;
    gstValues?: string;
    tenderFees?: string;
    emd?: string;
    teamMember: number;
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
    teamMember?: number;
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

// Tender Info Sheet Types (keep existing)
export interface TenderInfoSheet {
    id?: number;
    tenderId: number;

    // TE Recommendation
    teRecommendation: 'YES' | 'NO';
    teRejectionReason?: number | null;
    teRejectionRemarks?: string | null;

    // Processing Fee
    processingFeeRequired?: 'YES' | 'NO' | null;
    processingFeeAmount?: number | string | null;
    processingFeeMode?: string | null;  // ✅ Single string (comma-separated)
    processingFeeModes?: string[] | null; // ✅ Array version for frontend

    // Tender Fee
    tenderFeeRequired?: 'YES' | 'NO' | null;
    tenderFeeAmount?: number | string | null;
    tenderFeeMode?: string | null;  // ✅ Single string
    tenderFeeModes?: string[] | null;

    // EMD
    emdRequired?: 'YES' | 'NO' | 'EXEMPT' | null;
    emdAmount?: number | string | null;
    emdMode?: string | null;  // ✅ Single string
    emdModes?: string[] | null;

    // Auction & Terms
    reverseAuctionApplicable?: 'YES' | 'NO' | null;
    paymentTermsSupply?: number | null;
    paymentTermsInstallation?: number | null;
    bidValidityDays?: number | null;
    commercialEvaluation?: 'ITEM_WISE_GST_INCLUSIVE' | 'ITEM_WISE_PRE_GST' | 'OVERALL_GST_INCLUSIVE' | 'OVERALL_PRE_GST' | null;
    mafRequired?: 'YES_GENERAL' | 'YES_PROJECT_SPECIFIC' | 'NO' | null;

    // Delivery Time
    deliveryTimeSupply?: number | null;
    deliveryTimeInstallationInclusive?: boolean;
    deliveryTimeInstallationDays?: number | null;
    deliveryTimeInstallation?: number | null;

    // PBG
    pbgRequired?: 'YES' | 'NO' | null;
    pbgMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    pbgForm?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    pbgPercentage?: number | string | null;
    pbgDurationMonths?: number | null;

    // Security Deposit
    sdRequired?: 'YES' | 'NO' | null;
    sdMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    sdForm?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    sdPercentage?: number | string | null;
    securityDepositPercentage?: number | string | null;
    sdDurationMonths?: number | null;

    // LD
    ldRequired?: 'YES' | 'NO' | null;
    ldPercentagePerWeek?: number | string | null;
    maxLdPercentage?: number | string | null;

    // Physical Docs
    physicalDocsRequired?: 'YES' | 'NO' | null;
    physicalDocsDeadline?: string | Date | null;

    // Technical Eligibility
    techEligibilityAge?: number | null;
    techEligibilityAgeYears?: number | null;
    workOrderValue1Required?: 'YES' | 'NO' | null;
    orderValue1?: number | string | null;
    wo1Custom?: string | null;
    workOrderValue2Required?: 'YES' | 'NO' | null;
    orderValue2?: number | string | null;
    wo2Custom?: string | null;
    workOrderValue3Required?: 'YES' | 'NO' | null;
    orderValue3?: number | string | null;
    wo3Custom?: string | null;

    // Financial Requirements
    avgAnnualTurnoverType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    avgAnnualTurnoverCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    avgAnnualTurnoverValue?: number | string | null;
    workingCapitalType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    workingCapitalCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    workingCapitalValue?: number | string | null;
    solvencyCertificateType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    solvencyCertificateCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    solvencyCertificateValue?: number | string | null;
    netWorthType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    netWorthCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    netWorthValue?: number | string | null;

    // Documents
    technicalWorkOrders?: string[] | null;
    commercialDocuments?: string[] | null;

    // Client & Address
    clientOrganization?: string | null;
    clients?: TenderClient[];
    courierAddress?: string | null;

    // Final Remark
    teFinalRemark?: string | null;
    teRemark?: string | null;
    rejectionRemark?: string | null;
}

export interface SaveTenderInfoSheetDto {
    teRecommendation: 'YES' | 'NO';
    teRejectionReason?: number | null;
    teRejectionRemarks?: string | null;
    processingFeeRequired?: 'YES' | 'NO' | null;
    processingFeeAmount?: number | null;
    processingFeeModes?: string[] | null;
    tenderFeeRequired?: 'YES' | 'NO' | null;
    tenderFeeAmount?: number | null;
    tenderFeeModes?: string[] | null;
    emdRequired?: 'YES' | 'NO' | 'EXEMPT' | null;
    emdAmount?: number | null;
    emdModes?: string[] | null;
    reverseAuctionApplicable?: 'YES' | 'NO' | null;
    paymentTermsSupply?: number | null;
    paymentTermsInstallation?: number | null;
    bidValidityDays?: number | null;
    commercialEvaluation?: 'ITEM_WISE_GST_INCLUSIVE' | 'ITEM_WISE_PRE_GST' | 'OVERALL_GST_INCLUSIVE' | 'OVERALL_PRE_GST' | null;
    mafRequired?: 'YES_GENERAL' | 'YES_PROJECT_SPECIFIC' | 'NO' | null;
    deliveryTimeSupply?: number | null;
    deliveryTimeInstallationInclusive?: boolean;
    deliveryTimeInstallationDays?: number | null;
    pbgRequired?: 'YES' | 'NO' | null;
    pbgMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    pbgPercentage?: number | null;
    pbgDurationMonths?: number | null;
    sdRequired?: 'YES' | 'NO' | null;
    sdMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    sdPercentage?: number | null;
    sdDurationMonths?: number | null;
    ldRequired?: 'YES' | 'NO' | null;
    ldPercentagePerWeek?: number | null;
    maxLdPercentage?: number | null;
    physicalDocsRequired?: 'YES' | 'NO' | null;
    physicalDocsDeadline?: string | Date | null;
    techEligibilityAge?: number | null;
    workOrderValue1Required?: 'YES' | 'NO' | null;
    orderValue1?: number | null;
    wo1Custom?: string | null;
    workOrderValue2Required?: 'YES' | 'NO' | null;
    orderValue2?: number | null;
    wo2Custom?: string | null;
    workOrderValue3Required?: 'YES' | 'NO' | null;
    orderValue3?: number | null;
    wo3Custom?: string | null;
    avgAnnualTurnoverType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    avgAnnualTurnoverValue?: number | null;
    workingCapitalType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    workingCapitalValue?: number | null;
    solvencyCertificateType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    solvencyCertificateValue?: number | null;
    netWorthType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    netWorthValue?: number | null;
    technicalWorkOrders?: string[] | null;
    commercialDocuments?: string[] | null;
    clientOrganization?: string | null;
    clients: Array<{
        clientName: string;
        clientDesignation?: string | null;
        clientMobile?: string | null;
        clientEmail?: string | null;
    }>;
    courierAddress?: string | null;
    teFinalRemark?: string | null;
}

export type PaymentPurpose = "EMD" | "Tender Fee" | "Processing Fee";

export type InstrumentType =
    | "DD"
    | "FDR"
    | "BG"
    | "Cheque"
    | "Bank Transfer"
    | "Portal Payment";

export type DashboardRowType = "request" | "missing";

export type DashboardStatus =
    | "Not Created"
    | "Pending"
    | "Sent"
    | "Requested"
    | "Approved"
    | "Rejected"
    | "Returned"
    | "Issued"
    | "Dispatched"
    | "Received"
    | "Cancelled"
    | "Refunded"
    | "Encashed"
    | "Extended";

export interface DashboardRow {
    id: number | null;
    type: DashboardRowType;
    purpose: PaymentPurpose;
    amountRequired: string;
    status: DashboardStatus;
    instrumentType: InstrumentType | null;
    instrumentStatus: string | null;
    createdAt: string | null; // ISO string from API
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string | null; // ISO string from API
    teamMemberId: number | null;
    teamMemberName: string | null;
    requestedBy: string | null;
}

export interface DashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

export interface DashboardResponse {
    data: DashboardRow[];
    counts: DashboardCounts;
}

export type DashboardTab = "pending" | "sent" | "approved" | "rejected" | "returned" | "all";
