export type DashboardTab = 'pending' | 'rejected' | 'returned' | 'cancelled' | 'pnb-bg-linked' | 'ybl-bg-linked' | 'security-deposit' | 'bond-linked';

export interface DashboardFilters {
    tab?: DashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    team?: number;
}

export interface FdrDashboardRow {
    id: number;
    requestId: number;
    fdrCreationDate: string | null;
    fdrNo: string | null;
    beneficiaryName: string | null;
    fdrAmount: number | null;
    tenderName: string | null;
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
    'pnb-bg-linked': number;
    'ybl-bg-linked': number;
    'security-deposit': number;
    'bond-linked': number;
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
    fdrSource: string | null;
    fdrExpiryDate: string | null;
    courierAddress: string | null;
    courierAddressJson: Record<string, any> | null;
    courierDeadline: number | null;
    deliverBy: string | null;
    tenderStatusName: string | null;
    utr: string | null;
    docketNo: string | null;
    generatedPdf: string | null;
    cancelPdf: string | null;
    docketSlip: string | null;
    courierDetails: {
        id: number;
        toOrg: string | null;
        toName: string | null;
        toAddr: string | null;
        toPin: string | null;
        toMobile: string | null;
        trackingNumber: string | null;
        courierProvider: string | null;
        docketNo: string | null;
        status: string | null;
    } | null;
    hasAccountsFormData: boolean;
    hasReturnedData: boolean;
    hasSettledData: boolean;
    linkedCheque?: LinkedChequeData | null;
    linkedBg?: LinkedBgData | null;
}

export interface LinkedChequeData {
    chequeNo: string | null;
    amount: number | null;
    status: string | null;
    requestId: number | null;
}

export interface LinkedBgData {
    instrumentId: number;
    bgNo: string | null;
    bankName: string | null;
    status: string | null;
}

export interface FdrViewProps {
    data: FDRActionFormData;
    followupData?: FDRFollowupData | null;
    isLoading?: boolean;
    className?: string;
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
    courierOrg?: string;
    courierName?: string;
    courierPhone?: string;
    courierAddrLine1?: string;
    courierAddrLine2?: string;
    courierCity?: string;
    courierState?: string;
    courierPincode?: string;
    empFrom?: number;
    delDate?: string;
    urgency?: number;
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
    instrumentData?: {
        tenderNo?: string;
        tenderName?: string;
        amount?: number;
        fdrNo?: string;
        fdrDate?: string | Date;
        fdrExpiryDate?: string | Date;
        fdrSource?: string;
        tenderStatusName?: string;
    };
    formHistory?: FDRFormHistory;
    linkedCheque?: LinkedChequeData | null;
    linkedBg?: LinkedBgData | null;
}
