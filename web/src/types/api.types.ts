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

export interface UserProfile {
    id?: number
    userId: number
    firstName?: string | null
    lastName?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    employeeCode?: string | null
    designationId?: number | null
    primaryTeamId?: number | null
    altEmail?: string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    image?: string | null
    signature?: string | null
    dateOfJoining?: string | null
    dateOfExit?: string | null
    timezone?: string | null
    locale?: string | null
    createdAt?: string
    updatedAt?: string
}

export interface User {
    id: number
    name: string
    email: string
    username: string | null
    mobile: string | null
    role?: string | null
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
    team?: NamedEntity | null
    designation?: NamedEntity | null
    profile?: UserProfile | null
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

export interface Team {
    id: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
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
export interface Team {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

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

export interface TenderInfo {
    id: number;
    team: number;
    tenderNo: string;
    organization?: number | null;
    tenderName: string;
    item: number;
    gstValues: number;
    tenderFees: number;
    emd: number;
    teamMember: number;
    dueDate: string;
    remarks?: string | null;
    status: number;
    location?: number | null;
    website?: number | null;
    deleteStatus: "0" | "1";
    tlStatus: "0" | "1" | "2" | "3";
    tlRemarks?: string | null;
    rfqTo?: string | null;
    courierAddress?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTenderInfoDto {
    team: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    teamMember: number;
    dueDate: string;
    gstValues?: number;
    tenderFees?: number;
    emd?: number;
    organization?: number;
    status?: number;
    location?: number;
    website?: number;
    remarks?: string;
    deleteStatus?: "0" | "1";
    tlStatus?: "0" | "1" | "2" | "3";
    tlRemarks?: string;
    rfqTo?: string;
    courierAddress?: string;
}

export interface UpdateTenderInfoDto extends Partial<CreateTenderInfoDto> { }

export interface TenderInfoWithNames extends TenderInfo {
    organizationName: string | null;
    teamMemberName: string | null;
    teamMemberUsername: string | null;
    statusName: string | null;
    itemName: string | null;
    organizationAcronym: string | null;
    locationName: string | null;
    locationState: string | null;
    websiteName: string | null;
    websiteLink: string | null;
};

export interface TenderInfoSheetClient {
    id?: number;
    clientName: string;
    clientDesignation?: string | null;
    clientMobile?: string | null;
    clientEmail?: string | null;
}

export interface TenderInfoSheet {
    id: number;
    tenderId: number;

    teRecommendation: 'YES' | 'NO';
    teRejectionReason: number | null;
    teRejectionRemarks: string | null;
    teRemark: string | null;

    processingFeeAmount: number | null;
    processingFeeModes: string[] | null;

    tenderFeeAmount: number | null;
    tenderFeeModes: string[] | null;

    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdModes: string[] | null;

    reverseAuctionApplicable: 'YES' | 'NO' | null;
    paymentTermsSupply: number | null;
    paymentTermsInstallation: number | null;

    pbgForm: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    pbgPercentage: number | null;
    pbgDurationMonths: number | null;

    sdForm: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    securityDepositPercentage: number | null;
    sdDurationMonths: number | null;

    bidValidityDays: number | null;
    commercialEvaluation: 'ITEM_WISE_GST_INCLUSIVE' | 'ITEM_WISE_PRE_GST' | 'OVERALL_GST_INCLUSIVE' | 'OVERALL_PRE_GST' | null;
    mafRequired: 'YES_GENERAL' | 'YES_PROJECT_SPECIFIC' | 'NO' | null;

    deliveryTimeSupply: number | null;
    deliveryTimeInstallationInclusive: boolean;
    deliveryTimeInstallation: number | null;

    ldPercentagePerWeek: number | null;
    maxLdPercentage: number | null;

    physicalDocsRequired: 'YES' | 'NO' | null;
    physicalDocsDeadline: string | null;

    techEligibilityAgeYears: number | null;
    orderValue1: number | null;
    orderValue2: number | null;
    orderValue3: number | null;

    avgAnnualTurnoverCriteria: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    avgAnnualTurnoverValue: number | null;

    workingCapitalCriteria: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    workingCapitalValue: number | null;

    solvencyCertificateCriteria: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    solvencyCertificateValue: number | null;

    netWorthCriteria: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    netWorthValue: number | null;

    clientOrganization: string | null;
    courierAddress: string | null;

    rejectionRemark: string | null;

    clients: TenderInfoSheetClient[];
    technicalWorkOrders: string[];
    commercialDocuments: string[];

    createdAt: string;
    updatedAt: string;
}

export interface SaveTenderInfoSheetDto {
    teRecommendation: 'YES' | 'NO';
    teRejectionReason: number | null;
    teRejectionRemarks: string | null;

    processingFeeAmount: number | null;
    processingFeeModes: string[] | null;

    tenderFeeAmount: number | null;
    tenderFeeModes: string[] | null;

    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdModes: string[] | null;

    reverseAuctionApplicable: 'YES' | 'NO' | null;
    paymentTermsSupply: number | null;
    paymentTermsInstallation: number | null;

    bidValidityDays: number | null;
    commercialEvaluation: string | null;
    mafRequired: string | null;

    deliveryTimeSupply: number | null;
    deliveryTimeInstallationInclusive: boolean;
    deliveryTimeInstallation: number | null;

    pbgForm: string | null;
    pbgPercentage: number | null;
    pbgDurationMonths: number | null;

    sdForm: string | null;
    securityDepositPercentage: number | null;
    sdDurationMonths: number | null;

    ldPercentagePerWeek: number | null;
    maxLdPercentage: number | null;

    physicalDocsRequired: 'YES' | 'NO' | null;
    physicalDocsDeadline: string | null;

    techEligibilityAgeYears: number | null;
    orderValue1: number | null;
    orderValue2: number | null;
    orderValue3: number | null;

    technicalWorkOrders: string[] | null;
    commercialDocuments: string[] | null;

    avgAnnualTurnoverCriteria: string | null;
    avgAnnualTurnoverValue: number | null;

    workingCapitalCriteria: string | null;
    workingCapitalValue: number | null;

    solvencyCertificateCriteria: string | null;
    solvencyCertificateValue: number | null;

    netWorthCriteria: string | null;
    netWorthValue: number | null;

    clientOrganization: string | null;
    courierAddress: string | null;

    clients: Array<{
        clientName: string;
        clientDesignation: string | null;
        clientMobile: string | null;
        clientEmail: string | null;
    }>;

    teRemark: string | null;
}
