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
