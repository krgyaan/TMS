import { TenderInfo } from "@/db/schemas";

/**
 * Paginated result structure used across all dashboard endpoints
 */
export type PaginatedResult<T> = {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

/**
 * Common filter parameters for list endpoints
 */
export type BaseFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

/**
 * Common dashboard counts structure
 */
export type DashboardCounts = {
    [key: string]: number;
    total: number;
};

export type TenderInfoWithNames = TenderInfo & {
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

export type TenderReference = {
    id: number;
    tenderNo: string;
    tenderName: string;
    organizationName: string | null;
    organizationAcronym: string | null;
    teamMemberName: string | null;
    statusName: string | null;
    dueDate: Date;
};

export type TenderForPayment = {
    id: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string;
    tenderFees: string;
    emd: string;
    dueDate: Date;
    organizationName: string | null;
    teamMemberName: string | null;
};

export type TenderForRfq = {
    id: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number;
    teamMemberName: string | null;
    status: number;
    statusName: string | null;
    itemName: string | null;
    rfqTo: string | null;
    dueDate: Date;
};

export type TenderForPhysicalDocs = {
    id: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string | null;
    teamMemberName: string | null;
    statusName: string | null;
    dueDate: Date;
};

export type TenderForApproval = {
    id: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    itemName: string | null;
    gstValues: string;
    tenderFees: string;
    emd: string;
    teamMember: number;
    teamMemberName: string | null;
    dueDate: Date;
    status: number;
    statusName: string | null;
    tlStatus: number;
};
