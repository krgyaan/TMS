export type DashboardTab = 'pending' | 'created' | 'rejected' | 'returned' | 'cancelled';

export interface DashboardFilters {
    tab?: DashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
}

export interface DemandDraftDashboardRow {
    id: number;
    requestId: number;
    tenderId: number;
    tenderNo: string;
    projectName: string | null;
    purpose: string;
    amount: string | null;
    instrumentId: number;
    ddStatus: string;
    action: number;
    requestedByName: string | null;
    createdAt: string | null;
}

export interface DemandDraftDashboardCounts {
    pending: number;
    created: number;
    rejected: number;
    returned: number;
    cancelled: number;
}

export interface DDActionFormData {
    id: number;
    action: number;
    ddStatus: string;
    tenderNo: string;
    tenderName: string;
    tenderId: number;
    amount: number | null;
    favouring: string | null;
    payableAt: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    ddNo: string | null;
    ddDate: string | null;
    reqNo: string | null;
    ddNeeds: string | null;
    ddPurpose: string | null;
    ddRemarks: string | null;
    courierAddress: string | null;
    courierDeadline: number | null;
    utr: string | null;
    docketNo: string | null;
    generatedPdf: string | null;
    cancelPdf: string | null;
    docketSlip: string | null;
    hasAccountsFormData: boolean;
    hasReturnedData: boolean;
    hasSettledData: boolean;
}

export interface DDFollowupData {
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
    ddReq?: 'Accepted' | 'Rejected';
    reasonReq?: string;
    ddNo?: string;
    ddDate?: string;
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
    cancelRemark?: string;
}

export interface CancellationConfirmHistory {
    cancellationDate?: string;
    cancellationAmount?: string;
    cancellationReferenceNo?: string;
}

export interface DDFormHistory {
    accountsForm?: AccountsFormHistory;
    initiateFollowup?: FollowupHistory;
    returnedCourier?: ReturnedCourierHistory;
    returnedBankTransfer?: ReturnedBankTransferHistory;
    settled?: SettledHistory;
    requestCancellation?: CancellationHistory;
    cancellationConfirmation?: CancellationConfirmHistory;
}

export const ALL_DD_ACTION_OPTIONS = [
    { value: 'accounts-form', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'returned-bank-transfer', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
    { value: 'request-cancellation', label: 'Send DD Cancellation Request' },
    { value: 'cancellation-confirmation', label: 'DD cancelled at Branch' },
];

export interface DDActionFormProps {
    instrumentId: number;
    action?: number | null;
    formHistory?: DDFormHistory;
}
