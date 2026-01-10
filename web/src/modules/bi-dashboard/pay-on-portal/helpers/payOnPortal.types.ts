export type PayOnPortalDashboardTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';

export type PayOnPortalDashboardFilters = {
    tab?: PayOnPortalDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface PayOnPortalDashboardRow {
    id: number;
    date: Date | null;
    teamMember: string | null;
    utrNo: string | null;
    portalName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    amount: number | null;
    popStatus: string | null;
}

export interface PayOnPortalDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    returned: number;
    settled: number;
    total: number;
}
