export interface BankGuaranteeDashboardRow {
    id: number;
    requestId: number;
    bgDate: Date | null;
    bgNo: string | null;
    beneficiaryName: string | null;
    tenderName: string | null;
    /** Tender/project name, or "Accounts/Admin" when neither is linked. */
    projectLabel: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    amount: number | null;
    bgExpiryDate: Date | null;
    bgExpiryDateCoalesced: Date | null;
    bgClaimExpiryDate: Date | null;
    bgClaimPeriod: number | null;
    expiryDate: Date | null;
    bgChargesPaid: number | null;
    bgChargesCalculated: number | null;
    fdrNo: string | null;
    fdrValue: number | null;
    tenderStatus: string | null;
    expiryStatus: string | null;
    bgStatus: string | null;
    /** Stage timer: Stage 1 = 12h, Stage 2 = BG Needed In hours. */
    timer: {
        remainingSeconds: number;
        status: 'RUNNING' | 'OVERDUE';
        deadline: Date;
    } | null;
}

export interface BankGuaranteeDashboardCounts {
    'new-requests': number;
    'live-pnb': number;
    'live-bg-limit': number;
    'live-sbi': number;
    'live-yes': number;
    'live-au': number;
    cancelled: number;
    rejected: number;
    total: number;
}

export interface BankGuaranteeCardStats {
    bankStats: Record<string, {
        count: number;
        percentage: number;
        amount: number;
        fdrAmount10: number;
        fdrAmount15: number;
        fdrAmount100: number;
    }>;
    totalBgCount: number;
    totalBgAmount: number;
}
