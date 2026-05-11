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
    amount: number | null;
    portalName: string | null;
    utrNo: string | null;
    transactionDate: Date | null;
    paymentMethod: string | null;
    utrMsg: string | null;
    isNetbanking: string | null;
    isDebit: string | null;
    returnTransferDate: string | null;
    returnUtr: string | null;
    reason: string | null;
    remarks: string | null;
    rejectionReason: string | null;
    paymentDateTime: string | null;
    paymentProofPath: string | null;
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
