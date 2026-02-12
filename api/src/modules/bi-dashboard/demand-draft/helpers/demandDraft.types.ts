export interface DemandDraftDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    ddCreationDate: Date | null;
    ddNo: string | null;
    beneficiaryName: string | null;
    ddAmount: number | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    teamMember: string | null;
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
