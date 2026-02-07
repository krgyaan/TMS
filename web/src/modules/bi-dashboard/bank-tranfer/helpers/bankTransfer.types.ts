export type BankTransferDashboardTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';

export type BankTransferDashboardFilters = {
    tab?: BankTransferDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface BankTransferDashboardRow {
    id: number;
    requestId: number;
    date: Date | null;
    teamMember: string | null;
    utrNo: string | null;
    accountName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    amount: number | null;
    btStatus: string | null;
}

export interface BankTransferDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    returned: number;
    settled: number;
    total: number;
}
