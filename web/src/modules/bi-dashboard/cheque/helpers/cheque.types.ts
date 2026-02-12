export type ChequeDashboardTab = 'cheque-pending' | 'cheque-payable' | 'cheque-paid-stop' | 'cheque-for-security' | 'cheque-for-dd-fdr' | 'rejected' | 'cancelled' | 'expired';

export type ChequeDashboardFilters = {
    tab?: ChequeDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface ChequeDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    date: Date | null;
    chequeNo: string | null;
    payeeName: string | null;
    bidValidity: Date | null;
    amount: number | null;
    type: string | null;
    cheque: string | null;
    dueDate: Date | null;
    expiry: Date | null;
    chequeStatus: string | null;
}

export interface ChequeDashboardCounts {
    'cheque-pending': number;
    'cheque-payable': number;
    'cheque-paid-stop': number;
    'cheque-for-security': number;
    'cheque-for-dd-fdr': number;
    rejected: number;
    cancelled: number;
    expired: number;
    total: number;
}
