export type BankGuaranteeDashboardTab = 'new-requests' | 'live-yes' | 'live-pnb' | 'live-bg-limit' | 'cancelled' | 'rejected';

export type BankGuaranteeDashboardFilters = {
    tab?: BankGuaranteeDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface BankGuaranteeDashboardRow {
    id: number;
    requestId: number;
    bgDate: Date | null;
    bgNo: string | null;
    beneficiaryName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    amount: number | null;
    bgExpiryDate: Date | null;
    bgClaimPeriod: number | null;
    expiryDate: Date | null;
    bgChargesPaid: number | null;
    bgChargesCalculated: number | null;
    fdrNo: string | null;
    fdrValue: number | null;
    tenderStatus: string | null;
    expiry: Date | null;
    expiryStatus: string | null;
    bgStatus: string | null;
}

export interface BankGuaranteeDashboardCounts {
    'new-requests': number;
    'live-yes': number;
    'live-pnb': number;
    'live-bg-limit': number;
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
