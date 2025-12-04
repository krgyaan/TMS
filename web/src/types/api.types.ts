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
