export type BankTransferDashboardTab = 'pending' | 'accepted' | 'rejected' | 'returned' | 'settled';

export type BankTransferDashboardFilters = {
    tab?: BankTransferDashboardTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export interface BankTransferDashboardRow {
    id: number;
    requestId: number;
    purpose: string | null;
    date: Date | null;
    teamMember: string | null;
    utrNo: string | null;
    accountName: string | null;
    tenderName: string | null;
    tenderNo: string | null;
    bidValidity: Date | null;
    tenderStatus: string | null;
    amount: number | null;
    btStatus: string | null;
}

export interface BankTransferDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    returned: number;
    settled: number;
    total: number;
}

export interface BankTransferActionFormData {
    id: number;
    action: number | null;
    btStatus: string | null;
    tenderNo: string | null;
    tenderName: string | null;
    amount: number | null;
    accountName: string | null;
    utrNo: string | null;
    transactionDate: Date | null;
    paymentMethod: string | null;
    utrMsg: string | null;
    returnTransferDate: string | null;
    returnUtr: string | null;
    reason: string | null;
    remarks: string | null;
    rejectionReason: string | null;
    paymentDateTime: string | null;
}

export interface BankTransferFollowupData {
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
