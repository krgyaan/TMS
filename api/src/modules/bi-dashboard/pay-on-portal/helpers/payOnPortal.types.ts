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
