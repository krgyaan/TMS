export interface ChequeDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    chequeNo: string | null;
    payeeName: string | null;
    bidValidity: Date | null;
    amount: number | null;
    type: string | null;
    cheque: string | null;
    dueDate: Date | null;
    expiry: string | null;
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
