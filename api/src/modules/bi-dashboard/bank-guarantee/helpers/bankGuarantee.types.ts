export interface BankGuaranteeDashboardRow {
    id: number;
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
