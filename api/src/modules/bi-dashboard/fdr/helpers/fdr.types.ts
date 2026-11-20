export interface FdrDashboardRow {
    id: number;
    requestId: number;
    fdrCreationDate: Date | null;
    fdrNo: string | null;
    beneficiaryName: string | null;
    fdrAmount: number | null;
    tenderName: string | null;
    projectLabel: string | null;
    tenderNo: string | null;
    tenderStatus: string | null;
    member: string | null;
    expiry: string | null;
    fdrStatus: string | null;
}

export interface FdrDashboardCounts {
    pending: number;
    rejected: number;
    returned: number;
    cancelled: number;
    'bg-linked': number;
    bg: number;
    'other-security': number;
    emd: number;
    'security-deposit': number;
    total: number;
}
