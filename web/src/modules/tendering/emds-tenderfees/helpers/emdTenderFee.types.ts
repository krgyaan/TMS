import type { EmdRequestFormValues, PaymentDetailsFormValues } from './emdTenderFee.schema';

/**
 * Props for EmdTenderFeeRequestForm component
 */
export interface EmdTenderFeeRequestFormProps {
    tenderId: number;
    mode: 'create' | 'edit';
    existingData?: any; // TODO: Define proper type for existing payment request data
}

// Re-export form value types
export type { EmdRequestFormValues, PaymentDetailsFormValues };

export type PaymentPurpose = "EMD" | "Tender Fee" | "Processing Fee";

export type InstrumentType = "DD" | "FDR" | "BG" | "Cheque" | "Bank Transfer" | "Portal Payment";

export type DashboardRowType = "request" | "missing";

export type DashboardStatus =
    | "Not Created"
    | "Pending"
    | "Sent"
    | "Requested"
    | "Approved"
    | "Rejected"
    | "Returned"
    | "Issued"
    | "Dispatched"
    | "Received"
    | "Cancelled"
    | "Refunded"
    | "Encashed"
    | "Extended";

export interface DashboardRow {
    id: number | null;
    type: DashboardRowType;
    purpose: PaymentPurpose;
    amountRequired: string;
    status: DashboardStatus;
    instrumentType: InstrumentType | null;
    instrumentStatus: string | null;
    createdAt: string | null; // ISO string from API
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string | null; // ISO string from API
    teamMemberId: number | null;
    teamMemberName: string | null;
    requestedBy: string | null;
}

export interface DashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

export interface DashboardResponse {
    data: DashboardRow[];
    counts: DashboardCounts;
}

export type DashboardTab = "pending" | "sent" | "approved" | "rejected" | "returned" | "all";

export type EmdDashboardFilters = {
    tab?: 'pending' | 'sent' | 'approved' | 'rejected' | 'returned' | 'tender-dnb';
    userId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
};

export interface EmdDashboardRow {
    id: number | null;
    type: "request" | "missing";
    purpose: "EMD" | "Tender Fee" | "Processing Fee";
    amountRequired: string;
    status: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    createdAt: string | null;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    statusName: string;
    dueDate: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    requestedBy: string | null;
}

export interface EmdDashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    tenderDnb: number;
    total: number;
}

export interface PendingTenderRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string | null;
    gstValues: string | null;
    status: number;
    statusName: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    emd: string | null;
    emdMode: string | null;
    tenderFee: string | null;
    tenderFeeMode: string | null;
    processingFee: string | null;
    processingFeeMode: string | null;
}

export interface PaymentRequestRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    purpose: "EMD" | "Tender Fee" | "Processing Fee";
    amountRequired: string;
    dueDate: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    instrumentId: number | null;
    instrumentType: string | null;
    instrumentStatus: string | null;
    displayStatus: string;
    createdAt: string | null;
}

export interface PendingTabResponse {
    data: PendingTenderRow[];
    counts: EmdDashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface RequestTabResponse {
    data: PaymentRequestRow[];
    counts: EmdDashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type EmdDashboardResponse = PendingTabResponse | RequestTabResponse;

export type CreatePaymentRequestDto = {
    emdMode?: string;
    emd?: any;
    tenderFeeMode?: string;
    tenderFee?: any;
    processingFeeMode?: string;
    processingFee?: any;
};

export type UpdatePaymentRequestDto = CreatePaymentRequestDto;

export type UpdateStatusDto = {
    status: string;
    remarks?: string;
};
