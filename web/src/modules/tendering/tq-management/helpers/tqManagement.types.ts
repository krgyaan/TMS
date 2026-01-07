import type { TqReceivedFormValues, TqRepliedFormValues, TqMissedFormValues } from './tqManagement.schema';

/**
 * Tender details for TQ management forms
 */
export interface TenderDetails {
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberName: string | null;
}

/**
 * Props for TqReceivedForm component
 */
export interface TqReceivedFormProps {
    tenderId: number;
    tenderDetails: TenderDetails;
    mode: 'create' | 'edit';
    existingData?: TenderQuery;
}

/**
 * Props for TqRepliedForm component
 */
export interface TqRepliedFormProps {
    tqData: TenderQuery;
    tenderDetails: TenderDetails;
    mode: 'replied' | 'edit';
}

/**
 * Props for TqMissedForm component
 */
export interface TqMissedFormProps {
    tqData: TenderQuery;
    tenderDetails: TenderDetails;
    mode: 'missed' | 'edit';
}

// Re-export form value types
export type { TqReceivedFormValues, TqRepliedFormValues, TqMissedFormValues };

export type TabKey = 'awaited' | 'received' | 'replied' | 'qualified' | 'disqualified';

export type TqManagementFilters = {
    tqStatus?: TenderQueryStatus | TenderQueryStatus[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export interface TqManagementDashboardCounts {
    awaited: number;
    received: number;
    replied: number;
    qualified: number;
    disqualified: number;
    total: number;
}

export type TenderQueryStatus = 'TQ awaited' | 'TQ received' | 'TQ replied' | 'Disqualified, TQ missed' | 'Disqualified, No TQ received' | 'TQ replied, Qualified' | 'Qualified, No TQ received';

export type TqStatus = 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ';

export type TenderQuery = {
    id: number;
    tenderId: number;
    tqSubmissionDeadline: Date | null;
    tqDocumentReceived: string | null;
    receivedBy: number | null;
    receivedAt: Date | null;
    repliedDatetime: Date | null;
    repliedDocument: string | null;
    proofOfSubmission: string | null;
    repliedBy: number | null;
    repliedAt: Date | null;
    missedReason: string | null;
    preventionMeasures: string | null;
    tmsImprovements: string | null;
    status: TqStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type TenderQueryItem = {
    id: number;
    tenderQueryId: number;
    srNo: number;
    tqTypeId: number;
    queryDescription: string;
    response: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type TqManagementDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    bidSubmissionDate: Date | null;
    tqSubmissionDeadline: Date | null;
    tqStatus: TenderQueryStatus;
    tqId: number | null;
    tqCount: number;
    bidSubmissionId: number | null;
};

export type CreateTqReceivedDto = {
    tenderId: number;
    tqSubmissionDeadline: string;
    tqDocumentReceived: string | null;
    tqItems: Array<{
        tqTypeId: number;
        queryDescription: string;
    }>;
};

export type UpdateTqRepliedDto = {
    repliedDatetime: string;
    repliedDocument: string | null;
    proofOfSubmission: string;
};

export type UpdateTqMissedDto = {
    missedReason: string;
    preventionMeasures: string;
    tmsImprovements: string;
};


export interface TqManagementDashboardCounts {
    awaited: number;
    received: number;
    replied: number;
    qualified: number;
    disqualified: number;
    total: number;
}
