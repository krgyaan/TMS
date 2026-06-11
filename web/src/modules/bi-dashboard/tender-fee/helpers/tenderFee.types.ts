export type DDSubTab = 'pending' | 'created' | 'rejected' | 'returned' | 'cancelled';
export type PortalSubTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';
export type TransferSubTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';
export type InstrumentType = 'dd' | 'portal' | 'transfer';

export interface DashboardFilters {
    tab?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    team?: number;
}

export interface TenderFeeDDDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    ddCreationDate: string | null;
    ddNo: string | null;
    beneficiaryName: string | null;
    ddAmount: number | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: string | null;
    tenderStatus: string | null;
    teamMember: string | null;
    expiry: string | null;
    ddStatus: string | null;
}

export interface TenderFeePortalDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    date: string | null;
    teamMember: string | null;
    utrNo: string | null;
    portalName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: string | null;
    tenderStatus: string | null;
    amount: number | null;
    popStatus: string | null;
}

export interface TenderFeeTransferDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    date: string | null;
    teamMember: string | null;
    utrNo: string | null;
    accountName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: string | null;
    tenderStatus: string | null;
    amount: number | null;
    btStatus: string | null;
}

export interface TenderFeeDDDashboardCounts {
    pending: number;
    created: number;
    rejected: number;
    returned: number;
    cancelled: number;
    total: number;
}

export interface TenderFeePortalDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    returned: number;
    settled: number;
    total: number;
}

export interface TenderFeeTransferDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    returned: number;
    settled: number;
    total: number;
}
