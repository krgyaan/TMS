export type DemandDraftDashboardTab = 'pending' | 'created' | 'rejected' | 'returned' | 'cancelled';

export type DemandDraftDashboardFilters = {
    tab?: DemandDraftDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface DemandDraftDashboardRow {
    id: number;
    ddCreationDate: Date | null;
    ddNo: string | null;
    beneficiaryName: string | null;
    ddAmount: number | null;
    tenderNo: string | null;
    tenderName: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    member: string | null;
    expiry: string | null;
    ddStatus: string | null;
}

export interface DemandDraftDashboardCounts {
    pending: number;
    created: number;
    rejected: number;
    returned: number;
    cancelled: number;
    total: number;
}
