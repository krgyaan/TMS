export type DashboardTab = 'pending' | 'rejected' | 'returned' | 'cancelled' | 'pnb-bg-linked' | 'ybl-bg-linked' | 'security-deposit' | 'bond-linked';

export interface DashboardFilters {
    tab?: DashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
}

export interface FdrDashboardRow {
    id: number;
    requestId: number;
    tenderId: number;
    tenderNo: string;
    projectName: string | null;
    purpose: string;
    amount: string | null;
    instrumentId: number;
    fdrStatus: string;
    action: number;
    requestedByName: string | null;
    createdAt: string | null;
}

export interface FdrDashboardCounts {
    pending: number;
    rejected: number;
    returned: number;
    cancelled: number;
    pnbBgLinked: number;
    yblBgLinked: number;
    securityDeposit: number;
    bondLinked: number;
}

export interface FDRActionFormData {
    id: number;
    action: number;
    fdrStatus: string;
    tenderNo: string;
    tenderName: string;
    tenderId: number;
    amount: number | null;
    favouring: string | null;
    payableAt: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    fdrNo: string | null;
    fdrDate: string | null;
    reqNo: string | null;
    fdrNeeds: string | null;
    fdrPurpose: string | null;
    fdrRemark: string | null;
    courierAddress: string | null;
    courierDeadline: number | null;
    utr: string | null;
    docketNo: string | null;
    generatedPdf: string | null;
    cancelPdf: string | null;
    docketSlip: string | null;
    hasAccountsFormData: boolean;
    hasReturnedData: boolean;
}

export interface FDRFollowupData {
    id: number;
    organisationName: string | null;
    area: string | null;
    amount: number | null;
    contacts: any[];
    frequency: number | null;
    followupStartDate: string | null;
    nextFollowUpDate: string | null;
    stopReason: number | null;
    proofText: string | null;
    stopRemarks: string | null;
    proofImagePath: string | null;
    assignmentStatus: string | null;
    createdAt: string | null;
}

export interface AccountsFormHistory {
    fdrReq?: 'Accepted' | 'Rejected';
    reasonReq?: string;
    fdrNo?: string;
    fdrDate?: string;
    reqNo?: string;
    remarks?: string;
}

export interface FollowupHistory {
    organisationName?: string;
    contacts?: Array<{ name: string; phone?: string; email?: string }>;
    followupStartDate?: string;
    frequency?: number;
}

export interface ReturnedCourierHistory {
    docketNo?: string;
    docketSlip?: string;
}

export interface ReturnedBankTransferHistory {
    transferDate?: string;
    utr?: string;
}

export interface SettledHistory {
    remarks?: string;
}

export interface CancellationHistory {
    coveringLetter?: string;
    reqReceive?: string;
}

export interface CancellationConfirmHistory {
    cancellationDate?: string;
    cancellationAmount?: string;
    cancellationReferenceNo?: string;
}

export interface FDRFormHistory {
    accountsForm?: AccountsFormHistory;
    initiateFollowup?: FollowupHistory;
    returnedCourier?: ReturnedCourierHistory;
    returnedBankTransfer?: ReturnedBankTransferHistory;
    settled?: SettledHistory;
    requestCancellation?: CancellationHistory;
    cancellationConfirmation?: CancellationConfirmHistory;
}

export const ALL_FDR_ACTION_OPTIONS = [
    { value: 'accounts-form', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'returned-bank-transfer', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
    { value: 'request-cancellation', label: 'Send FDR Cancellation Request' },
    { value: 'cancellation-confirmation', label: 'FDR cancelled at Branch' },
];

export interface FDRActionFormProps {
    instrumentId: number;
    action?: number | null;
    tenderId?: number | null;
    formHistory?: FDRFormHistory;
}
