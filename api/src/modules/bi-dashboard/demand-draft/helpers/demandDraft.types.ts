export interface DemandDraftDashboardRow {
    id: number;
    ddCreationDate: Date | null;
    ddNo: string | null;
    beneficiaryName: string | null;
    ddAmount: number | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    member: string | null;
    expiry: Date | null;
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
