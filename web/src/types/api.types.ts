export type { TenderClient, TenderClientDto, TenderInfoSheet, TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
import type { TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
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

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
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
    roleId: number
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
    files?: VendorFile[];
    _counts?: {
        persons: number;
        gsts: number;
        accounts: number;
        files?: number;
    };
}

// DTOs for creating/updating vendor organizations with relations
export interface CreateVendorGstDto {
    org: number;
    gstState: string;
    gstNum: string;
    status?: boolean;
}

export interface UpdateVendorGstDto {
    gstState?: string;
    gstNum?: string;
    status?: boolean;
}

export interface CreateVendorAccountDto {
    org: number;
    accountName: string;
    accountNum: string;
    accountIfsc: string;
    status?: boolean;
}

export interface UpdateVendorAccountDto {
    accountName?: string;
    accountNum?: string;
    accountIfsc?: string;
    status?: boolean;
}

export interface CreateVendorFileDto {
    vendorId: number;
    name: string;
    filePath: string;
    status?: boolean;
}

export interface UpdateVendorFileDto {
    name?: string;
    filePath?: string;
    status?: boolean;
}

export interface CreateVendorOrganizationWithRelationsDto {
    organization: {
        name: string;
        address?: string;
        status?: boolean;
    };
    gsts?: Omit<CreateVendorGstDto, 'org'>[];
    accounts?: Omit<CreateVendorAccountDto, 'org'>[];
    persons?: Array<{
        name: string;
        email?: string;
        address?: string;
        status?: boolean;
        files?: Omit<CreateVendorFileDto, 'vendorId'>[];
    }>;
}

export interface UpdateVendorOrganizationWithRelationsDto {
    organization?: {
        name?: string;
        address?: string;
        status?: boolean;
    };
    gsts?: {
        create?: Omit<CreateVendorGstDto, 'org'>[];
        update?: Array<{ id: number; data: UpdateVendorGstDto }>;
        delete?: number[];
    };
    accounts?: {
        create?: Omit<CreateVendorAccountDto, 'org'>[];
        update?: Array<{ id: number; data: UpdateVendorAccountDto }>;
        delete?: number[];
    };
    persons?: {
        create?: Array<{
            name: string;
            email?: string;
            address?: string;
            status?: boolean;
            files?: Omit<CreateVendorFileDto, 'vendorId'>[];
        }>;
        update?: Array<{ id: number; data: Partial<CreateVendorDto> }>;
        delete?: number[];
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

// ========== PERMISSIONS ==========
export interface Permission {
    id: number;
    module: string;
    action: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserPermission {
    id: number;
    permissionId: number;
    module: string;
    action: string;
    description?: string | null;
    granted: boolean;
}

export interface AssignRoleDto {
    roleId: number;
}

export interface AssignPermissionDto {
    permissionId: number;
    granted: boolean;
}

export interface AssignPermissionsDto {
    permissions: AssignPermissionDto[];
}

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

// ========== EMD RESPONSIBILITY ==========
export interface EmdResponsibility {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEmdResponsibilityDto {
    name: string;
    status?: boolean;
}

export interface UpdateEmdResponsibilityDto extends Partial<CreateEmdResponsibilityDto> { }

// ========== FINANCIAL YEAR ==========
export interface FinancialYear {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFinancialYearDto {
    name: string;
    status?: boolean;
}

export interface UpdateFinancialYearDto extends Partial<CreateFinancialYearDto> { }

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
// Tender Info Sheet Types - Re-exported from consolidated types file

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

export interface IncompleteField {
    id?: number;
    fieldName: string;
    comment: string;
    status?: 'pending' | 'resolved';
}

export interface SaveTenderApprovalDto {
    tlStatus: '0' | '1' | '2' | '3' | number;
    rfqTo?: number[]; // vendor org IDs
    tenderFeeMode?: string;
    emdMode?: string;
    approvePqrSelection?: '1' | '2';
    approveFinanceDocSelection?: '1' | '2';
    tenderStatus?: number; // status ID
    oemNotAllowed?: string; // vendor org ID
    tlRejectionRemarks?: string;
    incompleteFields?: IncompleteField[];
}

export interface TenderApproval {
    id?: number;
    tenderId?: number;
    tlStatus?: '0' | '1' | '2' | '3' | number;
    tlDecision?: '0' | '1' | '2' | '3' | number; // Alias for tlStatus for backward compatibility
    rfqTo: number[] | null;
    tenderFeeMode: string | null;
    emdMode: string | null;
    approvePqrSelection: '1' | '2' | null;
    approveFinanceDocSelection: '1' | '2' | null;
    alternativeTechnicalDocs?: string[] | null;
    alternativeFinancialDocs?: string[] | null;
    tenderStatus: number | null;
    oemNotAllowed: string | null;
    tlRejectionRemarks: string | null;
    incompleteFields?: IncompleteField[];
    createdAt?: string;
    updatedAt?: string;
}

export interface TenderApprovalRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    gstValues: number;
    tenderFees: number;
    emd: number;
    teamMember: number;
    dueDate: string;
    status: number;
    teamMemberName: string;
    itemName: string;
    statusName: string;
    tlStatus: string | number;
}

export type TenderApprovalFilters = {
    tlStatus?: '0' | '1' | '2' | '3' | number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type TenderApprovalTabData = {
    key: '0' | '1' | '2' | '3';
    name: string;
    count: number;
    data: TenderApprovalRow[];
};

export interface TenderWithRelations extends TenderInfo {
    organizationName?: string | null;
    organizationAcronym?: string | null;
    teamMemberName?: string | null;
    teamMemberUsername?: string | null;
    statusName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
    infoSheet?: TenderInfoSheetResponse | null;
    approval?: TenderApproval | null;
    rfq?: Rfq | null;
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

export type CostingApprovalDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number | null;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Submitted' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
};

export type ApproveCostingDto = {
    finalPrice: string;
    receiptPrice: string;
    budgetPrice: string;
    grossMargin: string;
    oemVendorIds: number[];
    tlRemarks: string;
};

export type RejectCostingDto = {
    rejectionReason: string;
};

export type CostingApprovalListParams = {
    costingStatus?: 'Submitted' | 'Approved' | 'Rejected/Redo';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
    disqualified: number;
    total: number;
}

export interface ResultDashboardResponse {
    data: ResultDashboardRow[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
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

export interface PhysicalDocs {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    persons: PhysicalDocPerson[];
    createdAt?: string;
    updatedAt?: string;
}

export interface PhysicalDocsListParams {
    physicalDocsSent?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreatePhysicalDocsDto {
    tenderId: number;
    courierNo: number;
    submittedDocs?: string;
    physicalDocsPersons?: Omit<PhysicalDocPerson, 'id'>[];
}

export interface UpdatePhysicalDocsDto {
    id: number;
    courierNo?: number;
    submittedDocs?: string;
    physicalDocsPersons?: Omit<PhysicalDocPerson, 'id'>[];
}

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
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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

export interface BidSubmissionDashboardCounts {
    pending: number;
    submitted: number;
    missed: number;
    total: number;
}

export interface CostingApprovalDashboardCounts {
    submitted: number;
    approved: number;
    rejected: number;
    total: number;
}

export interface TenderApprovalDashboardCounts {
    pending: number;
    approved: number;
    rejected: number;
    incomplete: number;
    total: number;
}

export interface TqManagementDashboardCounts {
    awaited: number;
    received: number;
    replied: number;
    missed: number;
    noTq: number;
    total: number;
}

export interface PhysicalDocsDashboardCounts {
    pending: number;
    sent: number;
    total: number;
}

export interface DocumentChecklistsDashboardCounts {
    pending: number;
    submitted: number;
    total: number;
}

export interface CostingSheetDashboardCounts {
    pending: number;
    submitted: number;
    rejected: number;
    total: number;
}

export type CreateSheetResponse = {
    success: boolean;
    sheetUrl?: string;
    sheetId?: string;
    message?: string;
    isDuplicate?: boolean;
    existingSheetUrl?: string;
    suggestedName?: string;
};

export type DriveScopesResponse = {
    hasScopes: boolean;
    missingScopes: string[];
    grantedScopes: string[];
};

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

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface TenderListParams {
    statusIds?: number[];
    unallocated?: boolean;
    page?: number;
    limit?: number;
    search?: string;
}

export interface RfqDashboardRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    itemName: string;
    rfqTo: string;
    teamMemberName: string;
    statusName: string;
    dueDate: Date;
    rfqId: number | null;
    vendorOrganizationNames: string | null;
}

export interface Rfq {
}

export interface RfqItem {
    id: number;
    rfqId: number;
    requirement: string;
    unit: string | null;
    qty: string | null;
}

export interface RfqDocument {
    id: number;
    rfqId: number;
    docType: string;
    path: string;
    metadata: any;
}

export interface CreateRfqDto {
    tenderId: number;
    dueDate?: string;
    docList?: string;
    requestedVendor?: string;
    items: Array<{
        requirement: string;
        unit?: string;
        qty?: number;
    }>;
    documents?: Array<{
        docType: string;
        path: string;
        metadata?: any;
    }>;
}

export interface UpdateRfqDto {
    dueDate?: string;
    docList?: string;
    requestedVendor?: string;
    items?: Array<{
        requirement: string;
        unit?: string;
        qty?: number;
    }>;
}

// Add to existing types file

export interface PendingTenderRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string | null;
    gstValues: string | null;
    status: number;
    statusName: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    emd: string | null;
    emdMode: string | null;
    tenderFee: string | null;
    tenderFeeMode: string | null;
    processingFee: string | null;
    processingFeeMode: string | null;
}

export interface PaymentRequestRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    purpose: 'EMD' | 'Tender Fee' | 'Processing Fee';
    amountRequired: string;
    dueDate: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    instrumentId: number | null;
    instrumentType: string | null;
    instrumentStatus: string | null;
    displayStatus: string;
    createdAt: string | null;
}

export interface EmdDashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

export interface PendingTabResponse {
    data: PendingTenderRow[];
    counts: EmdDashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface RequestTabResponse {
    data: PaymentRequestRow[];
    counts: EmdDashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type EmdDashboardResponse = PendingTabResponse | RequestTabResponse;
