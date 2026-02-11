export type { TenderClient, TenderClientDto, TenderInfoSheet, TenderInfoSheetResponse } from "@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types";
import type { AuthUser, Team, UserRole, UserProfile } from "./auth.types";

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
    data: T[];
    total: number;
    page: number;
    limit: number;
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
    message: string;
    statusCode: number;
    error?: string;
}

export interface Company { }

export interface NamedEntity {
    id: number | null;
    name: string | null;
}

export interface CreateUserDto {
    name: string;
    email: string;
    username?: string | null;
    mobile?: string | null;
    password: string;
    isActive?: boolean;
    roleId: number;
}

export interface UpdateUserDto extends Partial<CreateUserDto> { }

export interface Location {
    id: number;
    name: string;
    acronym: string;
    state: string | null;
    region: string | null;
    status?: boolean;
    createdAt?: string;
    updatedAt?: string;
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
    id: number;
    name: string;
    tenderCategory: string | null;
    status?: boolean;
    createdAt?: string;
    updatedAt?: string;
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
    data?: T;
    user?: T;
    message?: string;
    status?: number;
}

export interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}

export interface Company {
    id: string;
    name: string;
    industryId: string;
    locationId: string;
    isActive: boolean;
    logo?: string;
    createdAt: string;
    updatedAt: string;
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
    gsts?: Omit<CreateVendorGstDto, "org">[];
    accounts?: Omit<CreateVendorAccountDto, "org">[];
    persons?: Array<{
        name: string;
        email?: string;
        address?: string;
        status?: boolean;
        files?: Omit<CreateVendorFileDto, "vendorId">[];
    }>;
}

export interface UpdateVendorOrganizationWithRelationsDto {
    organization?: {
        name?: string;
        address?: string;
        status?: boolean;
    };
    gsts?: {
        create?: Omit<CreateVendorGstDto, "org">[];
        update?: Array<{ id: number; data: UpdateVendorGstDto }>;
        delete?: number[];
    };
    accounts?: {
        create?: Omit<CreateVendorAccountDto, "org">[];
        update?: Array<{ id: number; data: UpdateVendorAccountDto }>;
        delete?: number[];
    };
    persons?: {
        create?: Array<{
            name: string;
            email?: string;
            address?: string;
            status?: boolean;
            files?: Omit<CreateVendorFileDto, "vendorId">[];
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

export interface UpdateDocumentSubmittedDto extends Partial<CreateDocumentSubmittedDto> { }

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
    description?: string;
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

// ========== FINANCE DOC TYPE ==========
export interface FinanceDocType {
    id: number;
    name: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFinanceDocTypeDto {
    name: string;
    status?: boolean;
}

export interface UpdateFinanceDocTypeDto extends Partial<CreateFinanceDocTypeDto> { }

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

// Re-export tendering types from their respective modules
export type {
    TenderInfo,
    TenderInfoWithNames,
    TenderWithRelations,
    CreateTenderRequest,
    UpdateTenderRequest,
    TenderListParams,
    TenderInfoDashboardCounts,
    TenderTimer,
    TimerStatus,
    TenderWithTimer,
} from '@/modules/tendering/tenders/helpers/tenderInfo.types';

export type {
    IncompleteField,
    SaveTenderApprovalDto,
    TenderApproval,
    TenderApprovalRow,
    TenderApprovalFilters,
    TenderApprovalTabData,
    TenderApprovalDashboardCounts,
} from '@/modules/tendering/tender-approval/helpers/tenderApproval.types';

// Re-export EMD/Tender Fee types
export type {
    PaymentPurpose,
    InstrumentType,
    DashboardRowType,
    DashboardStatus,
    DashboardRow,
    DashboardCounts,
    DashboardResponse,
    DashboardTab,
    EmdDashboardFilters,
    EmdDashboardRow,
    EmdDashboardCounts,
    PendingTenderRow,
    PaymentRequestRow,
    PendingTabResponse,
    RequestTabResponse,
    EmdDashboardResponse,
    CreatePaymentRequestDto,
    UpdatePaymentRequestDto,
    UpdateStatusDto,
} from '@/modules/tendering/emds-tenderfees/helpers/emdTenderFee.types';

// Re-export Document Checklist types
export type {
    TenderDocumentChecklist,
    ExtraDocument,
    CreateDocumentChecklistDto,
    UpdateDocumentChecklistDto,
    TenderDocumentChecklistDashboardRow,
    DocumentChecklistsDashboardCounts,
} from '@/modules/tendering/checklists/helpers/documentChecklist.types';

// Re-export Bid Submission types
export type {
    BidSubmissionStatus,
    BidDocuments,
    BidSubmission,
    BidSubmissionDashboardRow,
    BidSubmissionListParams,
    SubmitBidDto,
    MarkAsMissedDto,
    UpdateBidSubmissionDto,
    BidSubmissionDashboardCounts,
} from '@/modules/tendering/bid-submissions/helpers/bidSubmission.types';

// Re-export Physical Docs types
export type {
    PhysicalDocsDashboardRow,
    PhysicalDocs,
    PhysicalDocsListParams,
    CreatePhysicalDocsDto,
    UpdatePhysicalDocsDto,
    PhysicalDocsPerson,
    PhysicalDocWithPersons,
    PhysicalDocsDashboardCounts,
} from '@/modules/tendering/physical-docs/helpers/physicalDocs.types';

// Re-export RFQ types
export type {
    RfqDashboardCounts,
} from '@/modules/tendering/rfqs/helpers/rfq.types';

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
