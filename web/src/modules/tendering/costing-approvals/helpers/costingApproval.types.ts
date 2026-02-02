import type { CostingApprovalFormValues, CostingRejectionFormValues } from './costingApproval.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

/**
 * Tender details for costing approval forms
 */
export interface TenderDetails {
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberName: string | null;
}

/**
 * Props for CostingApprovalForm component
 */
export interface CostingApprovalFormProps {
    costingSheet: TenderCostingSheet;
    tenderDetails: TenderDetails;
    mode: 'approve' | 'edit';
}

export interface CostingApprovalDashboardCounts {
    pending: number;
    approved: number;
    'tender-dnb': number;
    total: number;
}


/**
 * Props for CostingRejectionForm component
 */
export interface CostingRejectionFormProps {
    costingSheet: TenderCostingSheet;
    tenderDetails: TenderDetails;
}

export type CostingSheetStatus = 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo';


export type TenderCostingSheet = {
    id: number;
    tenderId: number;
    submittedBy: number | null;
    approvedBy: number | null;
    googleSheetUrl: string | null;
    sheetTitle: string | null;

    // Submitted values (TE)
    submittedFinalPrice: string | null;
    submittedReceiptPrice: string | null;
    submittedBudgetPrice: string | null;
    submittedGrossMargin: string | null;
    teRemarks: string | null;

    // Approved values (TL)
    finalPrice: string | null;
    receiptPrice: string | null;
    budgetPrice: string | null;
    grossMargin: string | null;
    oemVendorIds: number[] | null;
    tlRemarks: string | null;

    status: CostingSheetStatus;
    rejectionReason: string | null;

    submittedAt: Date | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

// Re-export form value types
export type { CostingApprovalFormValues, CostingRejectionFormValues };

export type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
};

export type SubmitCostingSheetDto = {
    tenderId: number;
    submittedFinalPrice: string;
    submittedReceiptPrice: string;
    submittedBudgetPrice: string;
    submittedGrossMargin: string;
    teRemarks: string;
};

export type UpdateCostingSheetDto = {
    submittedFinalPrice: string;
    submittedReceiptPrice: string;
    submittedBudgetPrice: string;
    submittedGrossMargin: string;
    teRemarks: string;
};

export type CostingApprovalTab = 'pending' | 'approved' | 'tender-dnb';

export type CostingApprovalDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number | null;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Submitted' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
};

export interface CostingApprovalDashboardRowWithTimer extends CostingApprovalDashboardRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}

export type ApproveCostingDto = {
    finalPrice: string;
    receiptPrice: string;
    budgetPrice: string;
    grossMargin: string;
    oemVendorIds: number[];
    tlRemarks: string;
};

export type RejectCostingDto = {
    rejectionReason: string;
};

export type CostingApprovalListParams = {
    tab?: CostingApprovalTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};
