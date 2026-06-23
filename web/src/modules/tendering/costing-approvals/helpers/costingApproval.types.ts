import type { CostingApprovalFormValues, CostingRejectionFormValues } from './costingApproval.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import type { CostingSheetStatus } from '@/modules/tendering/costing-sheets/helpers/costingSheet.types';

export type { CostingSheetStatus };

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
 * A single costing detail entry
 */
export type CostingDetailEntry = {
    id: number;
    tenderCostingSheetId: number;
    detailName: string | null;
    categoryName: string | null;
    submittedFinalPrice: string | null;
    submittedReceiptPrice: string | null;
    submittedBudgetPrice: string | null;
    submittedGrossMargin: string | null;
    teRemarks: string | null;
    submittedBy: number | null;
    submittedAt: Date | null;
    finalPrice: string | null;
    receiptPrice: string | null;
    budgetPrice: string | null;
    grossMargin: string | null;
    tlRemarks: string | null;
    rejectionReason: string | null;
    approvedBy: number | null;
    approvedAt: Date | null;
    oemVendorIds: number[] | null;
    status: CostingSheetStatus;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Sheet with all its details (what findById returns)
 */
export type CostingSheetWithDetails = {
    id: number;
    tenderId: number;
    submittedBy: number | null;
    approvedBy: number | null;
    googleSheetUrl: string | null;
    sheetTitle: string | null;
    oemVendorIds: number[] | null;
    createdAt: Date;
    updatedAt: Date;
    details: CostingDetailEntry[];
};

/**
 * Props for CostingApprovalForm component
 */
export interface CostingApprovalFormProps {
    costingSheet: CostingSheetWithDetails;
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
    costingSheet: CostingSheetWithDetails;
    tenderDetails: TenderDetails;
}

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
    costingDetailId: number | null;
};

export interface CostingApprovalDashboardRowWithTimer extends CostingApprovalDashboardRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}

export type ApproveCostingDto = {
    detailId?: number;
    finalPrice: string;
    receiptPrice: string;
    budgetPrice: string;
    grossMargin: string;
    oemVendorIds: number[];
    tlRemarks: string;
};

export type DetailApprovalDto = {
    detailId: number;
    finalPrice: string;
    receiptPrice: string;
    budgetPrice: string;
    grossMargin: string;
    tlRemarks: string;
};

export type ApproveAllCostingDto = {
    approvals: DetailApprovalDto[];
    oemVendorIds: number[];
};

export type RejectCostingDto = {
    detailId?: number;
    rejectionReason: string;
};

export type UpdateApprovedCostingDto = {
    detailId: number;
    finalPrice?: string;
    receiptPrice?: string;
    budgetPrice?: string;
    grossMargin?: string;
    tlRemarks?: string;
};

export type CostingApprovalListParams = {
    tab?: CostingApprovalTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

// Re-export form value types
export type { CostingApprovalFormValues, CostingRejectionFormValues };
