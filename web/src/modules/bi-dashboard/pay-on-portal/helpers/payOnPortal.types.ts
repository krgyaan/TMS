export type PayOnPortalDashboardTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';

export type PayOnPortalDashboardFilters = {
    tab?: PayOnPortalDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface PayOnPortalDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    date: Date | null;
    teamMember: string | null;
    utrNo: string | null;
    portalName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    amount: number | null;
    popStatus: string | null;
    action: number | null;
}

export interface PayOnPortalDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    returned: number;
    settled: number;
    total: number;
}

export interface PayOnPortalActionFormData {
    id: number;
    action: number | null;
    popStatus: string | null;
    tenderNo: string | null;
    tenderName: string | null;
    tenderId: number | null;
    amount: number | null;
    portalName: string | null;
    utrNo: string | null;
    transactionDate: Date | null;
    paymentMethod: string | null;
    utrMsg: string | null;
    isNetbanking: string | null;
    isDebit: string | null;
    returnTransferDate: Date | null;
    returnUtr: string | null;
    reason: string | null;
    remarks: string | null;
    rejectionReason: string | null;
    paymentDateTime: string | null;
    paymentProofPath: string | null;
    settledRemarks: string | null;
    hasAccountsFormData: boolean;
    hasReturnedData: boolean;
    hasSettledData: boolean;
}

export interface PayOnPortalFollowupData {
    id: number;
    organisationName: string | null;
    area: string | null;
    amount: number | null;
    contacts: Array<{
        name: string;
        email: string | null;
        phone: string | null;
        org: string | null;
        addedAt: string;
    }>;
    frequency: number | null;
    followupStartDate: Date | null;
    nextFollowUpDate: Date | null;
    stopReason: number | null;
    proofText: string | null;
    stopRemarks: string | null;
    proofImagePath: string | null;
    assignmentStatus: string | null;
    createdAt: Date;
}

export interface PayOnPortalViewProps {
    data: PayOnPortalActionFormData;
    followupData?: PayOnPortalFollowupData | null;
    isLoading?: boolean;
    className?: string;
}

export interface ActionOption {
    value: string;
    label: string;
}

export const ALL_ACTION_OPTIONS: ActionOption[] = [
    { value: 'accounts-form', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
];

export interface AccountsFormHistory {
    popReq?: 'Accepted' | 'Rejected';
    reasonReq?: string;
    paymentDatetime?: string;
    utrNo?: string;
    utrMessage?: string;
    paymentProof?: string[];
}

export interface FollowupHistory {
    organisationName?: string;
    contacts?: Array<{
        name: string;
        email: string | null;
        phone: string | null;
        org: string | null;
    }>;
    followupStartDate?: string;
    frequency?: number;
}

export interface ReturnedHistory {
    transferDate?: string;
    returnUtr?: string;
}

export interface SettledHistory {
    remarks?: string;
}

export interface FormHistory {
    accountsForm?: AccountsFormHistory;
    initiateFollowup?: FollowupHistory;
    returned?: ReturnedHistory;
    settled?: SettledHistory;
}

export interface PayOnPortalActionFormProps {
    instrumentId: number;
    action?: number | null;
    tenderId?: number | null;
    instrumentData?: {
        tenderNo?: string;
        tenderName?: string;
        amount?: number;
        utrNo?: string;
    };
    formHistory?: FormHistory;
}