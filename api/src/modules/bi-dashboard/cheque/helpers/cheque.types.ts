export interface ChequeDashboardRow {
    id: number;
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
