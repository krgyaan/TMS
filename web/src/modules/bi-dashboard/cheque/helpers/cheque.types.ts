export type ChequeDashboardTab = 'cheque-pending' | 'cheque-payable' | 'cheque-paid-stop' | 'cheque-for-security' | 'cheque-for-dd-fdr' | 'rejected' | 'cancelled' | 'expired';
export type ChequeExportTab = ChequeDashboardTab | 'all';

export type ChequeDashboardFilters = {
    tab?: ChequeDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    team?: number;
};

export interface ChequeDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    requestedBy: string | null;
    date: Date | null;
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

export interface AccountsFormHistory {
    chequeReq?: 'Accepted' | 'Rejected';
    reasonReq?: string;
    chequeNo?: string;
    dueDate?: string;
    handover?: string;
    chequeImages?: string[];
    positivePayConfirmation?: string;
    remarks?: string;
    chequeGivenFromAccount?: string;
}

export interface FollowupHistory {
    organisationName?: string;
    contacts?: Array<{ name: string; phone?: string; email?: string }>;
    followupStartDate?: string;
    frequency?: number;
}

export interface StopChequeHistory {
    stopReasonText?: string;
    proofImage?: string;
}

export interface PaidViaBankTransferHistory {
    transferDate?: string;
    amount?: number;
    utr?: string;
}

export interface DepositedInBankHistory {
    transferDate?: string;
    reference?: string;
}

export interface CancelledTornHistory {
    cancelledImagePath?: string;
}

export interface ChequeFormHistory {
    accountsForm?: AccountsFormHistory;
    initiateFollowup?: FollowupHistory;
    stopCheque?: StopChequeHistory;
    paidViaBankTransfer?: PaidViaBankTransferHistory;
    depositedInBank?: DepositedInBankHistory;
    cancelledTorn?: CancelledTornHistory;
}

export const ALL_CHEQUE_ACTION_OPTIONS = [
    { value: 'accounts-form', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'stop-cheque', label: 'Stop Cheque from the Bank' },
    { value: 'paid-via-bank-transfer', label: 'Paid via Bank Transfer' },
    { value: 'deposited-in-bank', label: 'Deposited in Bank' },
    { value: 'cancelled-torn', label: 'Cancelled/Torn' },
];

export interface ChequeActionFormProps {
    instrumentId: number;
    action?: number | null;
    tenderId?: number | null;
    instrumentData?: {
        tenderNo?: string;
        tenderName?: string;
        amount?: number;
        chequeNo?: string;
        chequeDate?: string | Date;
        tenderStatusName?: string;
    };
    formHistory?: ChequeFormHistory;
}
