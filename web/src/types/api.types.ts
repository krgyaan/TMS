import type { AuthUser, Team, UserRole, UserProfile } from './auth.types';

export interface User {
    id: number;
    name: string;
    email: string | null;
    username: string | null;
    mobile: string | null;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    deletedAt: Date | string | null;
    profile: UserProfile | null;
    team: Team | null;
    designation: { id: number; name: string } | null;
    role: UserRole | null;
}

export interface LoginResponse {
    user: AuthUser;
}

export interface MeResponse {
    user: AuthUser;
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
}

export interface ApiError {
    message: string
    statusCode: number
    error?: string
}

export interface Company {

}

export interface NamedEntity {
    id: number | null
    name: string | null
}

export interface CreateUserDto {
    name: string
    email: string
    username?: string | null
    mobile?: string | null
    password: string
    isActive?: boolean
}

export interface UpdateUserDto extends Partial<CreateUserDto> { }

export interface Location {
    id: number
    name: string
    acronym: string
    state: string | null
    region: string | null
    status?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface ItemHeading {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Item {
    id: number;
    name: string;
    teamId?: number | null;
    headingId?: number | null;
    status: boolean;
    createdAt: string;
    updatedAt: string;

    team?: {
        id: number;
        name: string;
    } | null;
    heading?: {
        id: number;
        name: string;
    } | null;
}

export interface Status {
    id: number
    name: string
    tenderCategory: string | null
    status?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface Industry {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Organization {
    id: number;
    name: string;
    acronym: string;
    industryId?: number | null;
    status: boolean;
    createdAt: string;
    updatedAt: string;

    industry?: {
        id: number;
        name: string;
    } | null;
}

export interface ApiResponse<T = any> {
    data?: T
    user?: T
    message?: string
    status?: number
}

export interface ApiError {
    message: string
    statusCode: number
    error?: string
}

export interface Company {
    id: string
    name: string
    industryId: string
    locationId: string
    isActive: boolean
    logo?: string
    createdAt: string
    updatedAt: string
}

export interface VendorOrganization {
    id: number;
    name: string;
    address?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VendorFile {
    id: number;
    vendorId: number;
    name: string;
    filePath: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VendorGst {
    id: number;
    org: number;
    gstState: string;
    gstNum: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VendorAcc {
    id: number;
    org: number;
    accountName: string;
    accountNum: string;
    accountIfsc: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Vendor {
    id: number;
    organizationId?: number | null;
    name: string;
    email?: string;
    address?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;

    organization?: {
        id: number;
        name: string;
        address?: string;
    } | null;
}

export interface VendorWithRelations extends Vendor {
    files?: VendorFile[];
}

export interface VendorOrganizationWithRelations extends VendorOrganization {
    persons: Vendor[];
    gsts: VendorGst[];
    accounts: VendorAcc[];
    _counts?: {
        persons: number;
        gsts: number;
        accounts: number;
    };
}

export interface VendorPerson {
    id: number;
    organizationId: number;
    name: string;
    email?: string;
    address?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VendorOrganizationWithPersons {
    id: number;
    name: string;
    persons: VendorPerson[];
}

export interface Website {
    id: number;
    name: string;
    url?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ImprestCategory {
    id: number;
    name: string;
    heading?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FollowupCategory {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFollowupCategoryDto {
    name: string;
    status?: boolean;
}

export interface UpdateFollowupCategoryDto extends Partial<CreateFollowupCategoryDto> { }

export interface Designation {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDesignationDto {
    name: string;
    status?: boolean;
}

export interface UpdateDesignationDto extends Partial<CreateDesignationDto> { }

export interface DocumentSubmitted {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDocumentSubmittedDto {
    name: string;
    status?: boolean;
}

export interface UpdateDocumentSubmittedDto
    extends Partial<CreateDocumentSubmittedDto> { }


export interface CreateVendorDto {
    organizationId?: number;
    name: string;
    email?: string;
    address?: string;
    status?: boolean;
}

export interface UpdateVendorDto extends Partial<CreateVendorDto> { }

export interface CreateVendorOrganizationDto {
    organizationId?: number;
    name: string;
    address?: string;
    status?: boolean;
}

export interface UpdateVendorOrganizationDto extends Partial<CreateVendorOrganizationDto> { }

export interface CreateOrganizationDto {
    name: string;
    acronym?: string;
    industryId?: number;
    status?: boolean;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> { }

export interface CreateWebsiteDto {
    name: string;
    url?: string;
    status?: boolean;
}

export interface UpdateWebsiteDto extends Partial<CreateWebsiteDto> { }

export interface CreateImprestCategoryDto {
    name: string;
    heading?: string;
    status?: boolean;
}

export interface UpdateImprestCategoryDto extends Partial<CreateImprestCategoryDto> { }


// ========== INDUSTRIES ==========
export interface Industry {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateIndustryDto {
    name: string;
    description?: string;
    status?: boolean;
}

export interface UpdateIndustryDto extends Partial<CreateIndustryDto> { }

// ========== TEAMS ==========

export interface CreateTeamDto {
    name: string;
    description?: string;
    status?: boolean;
}

export interface UpdateTeamDto extends Partial<CreateTeamDto> { }

// ========== ROLES ==========
export interface Role {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRoleDto {
    name: string;
    description?: string;
    status?: boolean;
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> { }

// ========== STATES ==========
export interface State {
    id: number;
    name: string;
    code?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStateDto {
    name: string;
    code?: string;
    status?: boolean;
}

export interface UpdateStateDto extends Partial<CreateStateDto> { }

// ========== TQ TYPES ==========
export interface TqType {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTqTypeDto {
    name: string;
    status?: boolean;
}

export interface UpdateTqTypeDto extends Partial<CreateTqTypeDto> { }

// ========== LEAD TYPES ==========
export interface LeadType {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLeadTypeDto {
    name: string;
    description?: string;
    status?: boolean;
}

export interface UpdateLeadTypeDto extends Partial<CreateLeadTypeDto> { }

// ========== LOAN PARTY ==========
export interface LoanParty {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLoanPartyDto {
    name: string;
    description?: string;
    status?: boolean;
}

export interface UpdateLoanPartyDto extends Partial<CreateLeadTypeDto> { }
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

export interface TenderWithRelations extends TenderInfo {
    organizationName?: string | null;
    organizationAcronym?: string | null;
    teamMemberName?: string | null;
    teamMemberUsername?: string | null;
    statusName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
    infoSheet?: TenderInfoSheet | null;
    physicalDocs?: PhysicalDocsDashboardRow | null;
    checklist?: TenderDocumentChecklistDashboardRow | null;
    costingSheet?: CostingSheetDashboardRow | null;
    bidSubmission?: BidSubmission | null;
    tqManagement?: TqManagementDashboardRow | null;
    ra?: RaDashboardRow | null;
    result?: ResultDashboardRow | null;
    emds?: EmdDashboardRow | null;
    processingFees?: EmdDashboardRow | null;
    emdsTenderFees?: EmdDashboardRow | null;
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

export interface TenderDocumentChecklist {
    id: number;
    tenderId: number;
    selectedDocuments: string[] | null;
    extraDocuments: ExtraDocument[] | null;
    submittedBy: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface ExtraDocument {
    name: string;
    path?: string;
}

export interface CreateDocumentChecklistDto {
    tenderId: number;
    selectedDocuments?: string[];
    extraDocuments?: ExtraDocument[];
}

export interface UpdateDocumentChecklistDto {
    id: number;
    selectedDocuments?: string[];
    extraDocuments?: ExtraDocument[];
}

export type TenderDocumentChecklistDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    gstValues: number;
    checklistSubmitted: boolean;
};

export type CostingSheetStatus = 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo';

export type TenderCostingSheet = {
    id: number;
    tenderId: number;
    submittedBy: number | null;
    approvedBy: number | null;
    googleSheetUrl: string | null;
    sheetTitle: string | null;

    // Submitted values (TE)
    submittedFinalPrice: string | null;
    submittedReceiptPrice: string | null;
    submittedBudgetPrice: string | null;
    submittedGrossMargin: string | null;
    teRemarks: string | null;

    // Approved values (TL)
    finalPrice: string | null;
    receiptPrice: string | null;
    budgetPrice: string | null;
    grossMargin: string | null;
    oemVendorIds: number[] | null;
    tlRemarks: string | null;

    status: CostingSheetStatus;
    rejectionReason: string | null;

    submittedAt: Date | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
};

export type SubmitCostingSheetDto = {
    tenderId: number;
    submittedFinalPrice: string;
    submittedReceiptPrice: string;
    submittedBudgetPrice: string;
    submittedGrossMargin: string;
    teRemarks: string;
};

export type UpdateCostingSheetDto = {
    submittedFinalPrice: string;
    submittedReceiptPrice: string;
    submittedBudgetPrice: string;
    submittedGrossMargin: string;
    teRemarks: string;
};

export type BidSubmissionStatus = 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';

export type BidDocuments = {
    submittedDocs: string[];
    submissionProof: string | null;
    finalPriceSs: string | null;
};

export type BidSubmission = {
    id: number;
    tenderId: number;
    status: BidSubmissionStatus;
    submissionDatetime: Date | null;
    finalBiddingPrice: string | null;
    documents: BidDocuments | null;
    submittedBy: number | null;
    reasonForMissing: string | null;
    preventionMeasures: string | null;
    tmsImprovements: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type TqStatus = 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ';

export type TenderQuery = {
    id: number;
    tenderId: number;
    tqSubmissionDeadline: Date | null;
    tqDocumentReceived: string | null;
    receivedBy: number | null;
    receivedAt: Date | null;
    repliedDatetime: Date | null;
    repliedDocument: string | null;
    proofOfSubmission: string | null;
    repliedBy: number | null;
    repliedAt: Date | null;
    missedReason: string | null;
    preventionMeasures: string | null;
    tmsImprovements: string | null;
    status: TqStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type TenderQueryItem = {
    id: number;
    tenderQueryId: number;
    srNo: number;
    tqTypeId: number;
    queryDescription: string;
    response: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type TenderResult = {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamExecutiveName: string | null;
    tenderValue: string | null;
    itemName: string | null;
    status: string;
    reverseAuctionId: number | null;
    raApplicable: boolean;
    technicallyQualified: string | null;
    disqualificationReason: string | null;
    qualifiedPartiesCount: string | null;
    qualifiedPartiesNames: string[] | null;
    result: string | null;
    l1Price: string | null;
    l2Price: string | null;
    ourPrice: string | null;
    qualifiedPartiesScreenshot: string | null;
    finalResultScreenshot: string | null;
    resultUploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type UploadResultDto = {
    technicallyQualified: 'Yes' | 'No';
    disqualificationReason?: string;
    qualifiedPartiesCount?: string;
    qualifiedPartiesNames?: string[];
    result?: 'Won' | 'Lost';
    l1Price?: string;
    l2Price?: string;
    ourPrice?: string;
    qualifiedPartiesScreenshot?: string;
    finalResultScreenshot?: string;
};

export type ReverseAuction = {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    tenderValue: string | null;
    itemName: string | null;
    bidSubmissionDate: Date | null;
    status: string;
    technicallyQualified: string | null;
    disqualificationReason: string | null;
    qualifiedPartiesCount: string | null;
    qualifiedPartiesNames: string[] | null;
    raStartTime: Date | null;
    raEndTime: Date | null;
    scheduledAt: Date | null;
    raResult: string | null;
    veL1AtStart: string | null;
    raStartPrice: string | null;
    raClosePrice: string | null;
    raCloseTime: Date | null;
    screenshotQualifiedParties: string | null;
    screenshotDecrements: string | null;
    finalResultScreenshot: string | null;
    resultUploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type ScheduleRaDto = {
    technicallyQualified: 'Yes' | 'No';
    disqualificationReason?: string;
    qualifiedPartiesCount?: string;
    qualifiedPartiesNames?: string[];
    raStartTime?: string;
    raEndTime?: string;
};

export type UploadRaResultDto = {
    raResult: 'Won' | 'Lost' | 'H1 Elimination';
    veL1AtStart: 'Yes' | 'No';
    raStartPrice?: string;
    raClosePrice?: string;
    raCloseTime?: string;
    screenshotQualifiedParties?: string;
    screenshotDecrements?: string;
    finalResultScreenshot?: string;
};

export type RaDashboardType = 'under-evaluation' | 'scheduled' | 'completed';

export interface RaDashboardRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    bidSubmissionDate: Date | null;
    tenderValue: string | null;
    itemName: string | null;
    tenderStatus: string | null;
    raStatus: string;
    raStartTime: Date | null;
    raEndTime: Date | null;
    technicallyQualified: string | null;
    result: string | null;
}

export interface RaDashboardCounts {
    underEvaluation: number;
    scheduled: number;
    completed: number;
    total: number;
}

export interface RaDashboardResponse {
    data: RaDashboardRow[];
    counts: RaDashboardCounts;
}

export type ResultDashboardType = 'pending' | 'won' | 'lost' | 'disqualified';

export interface EmdDetails {
    amount: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    displayText: string;
}

export interface ResultDashboardRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamExecutiveName: string | null;
    bidSubmissionDate: Date | null;
    tenderValue: string | null;
    finalPrice: string | null;
    itemName: string | null;
    tenderStatus: string | null;
    resultStatus: string;
    raApplicable: boolean;
    reverseAuctionId: number | null;
    emdDetails: EmdDetails | null;
}

export interface ResultDashboardCounts {
    pending: number;
    won: number;
    lost: number;
    total: number;
}

export interface ResultDashboardResponse {
    data: ResultDashboardRow[];
    counts: ResultDashboardCounts;
}

export interface PhysicalDocsDashboardRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string;
    physicalDocsRequired: string;
    physicalDocsDeadline: Date;
    teamMemberName: string;
    statusName: string;
    physicalDocs: number | null;
    courierNo: number | null;
};

export interface PhysicalDocPerson {
    id: number;
    name: string;
    email: string;
    phone: string;
};

export interface PhysicalDocWithPersons {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    persons: PhysicalDocPerson[];
};

export type TqManagementDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    bidSubmissionDate: Date | null;
    tqSubmissionDeadline: Date | null;
    tqStatus: 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ';
    tqId: number | null;
    tqCount: number;
    bidSubmissionId: number | null;
};

export type CreateTqReceivedDto = {
    tenderId: number;
    tqSubmissionDeadline: string;
    tqDocumentReceived: string | null;
    tqItems: Array<{
        tqTypeId: number;
        queryDescription: string;
    }>;
};

export type UpdateTqRepliedDto = {
    repliedDatetime: string;
    repliedDocument: string | null;
    proofOfSubmission: string;
};

export type UpdateTqMissedDto = {
    missedReason: string;
    preventionMeasures: string;
    tmsImprovements: string;
};

export type EmdDashboardFilters = {
    tab?: 'pending' | 'sent' | 'approved' | 'rejected' | 'returned' | 'all';
    userId?: number;
};

export interface EmdDashboardRow {
    id: number | null;
    type: 'request' | 'missing';
    purpose: 'EMD' | 'Tender Fee' | 'Processing Fee';
    amountRequired: string;
    status: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    createdAt: string | null;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    statusName: string;
    dueDate: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    requestedBy: string | null;
}

export interface EmdDashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

export interface EmdDashboardResponse {
    data: EmdDashboardRow[];
    counts: EmdDashboardCounts;
}

export type CreatePaymentRequestDto = {
    emdMode?: string;
    emd?: any;
    tenderFeeMode?: string;
    tenderFee?: any;
    processingFeeMode?: string;
    processingFee?: any;
};

export type UpdatePaymentRequestDto = CreatePaymentRequestDto;

export type UpdateStatusDto = {
    status: string;
    remarks?: string;
};
