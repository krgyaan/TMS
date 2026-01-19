export type FdrDashboardTab = 'pending' | 'pnb-bg-linked' | 'ybl-bg-linked' | 'security-deposit' | 'bond-linked' | 'rejected' | 'returned' | 'cancelled';

export type FdrDashboardFilters = {
    tab?: FdrDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface FdrDashboardRow {
    id: number;
    fdrCreationDate: Date | null;
    fdrNo: string | null;
    beneficiaryName: string | null;
    fdrAmount: number | null;
    tenderName: string | null;
    tenderNo: string | null;
    tenderStatus: string | null;
    member: string | null;
    expiry: Date | null;
    fdrStatus: string | null;
}

export interface FdrDashboardCounts {
    pending: number;
    'pnb-bg-linked': number;
    'ybl-bg-linked': number;
    'security-deposit': number;
    'bond-linked': number;
    rejected: number;
    returned: number;
    cancelled: number;
    total: number;
}
