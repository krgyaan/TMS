import type { CostingSheetFormValues } from './costingSheet.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

/**
 * Tender details for costing sheet forms
 */
export interface TenderDetails {
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberName: string | null;
}

/**
 * Props for CostingSheetSubmitForm component
 */
export interface CostingSheetSubmitFormProps {
    tenderId: number;
    tenderDetails: TenderDetails;
    mode: 'submit' | 'edit' | 'resubmit';
    existingData?: TenderCostingSheet;
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
export type { CostingSheetFormValues };

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

export interface CostingSheetDashboardRowWithTimer extends CostingSheetDashboardRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}
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

export type TabKey = 'pending' | 'submitted' | 'tender-dnb';

export interface CostingSheetDashboardCounts {
    pending: number;
    submitted: number;
    'tender-dnb': number;
    total: number;
}

export type CostingSheetListParams = {
    tab?: TabKey;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type CreateSheetResponse = {
    success: boolean;
    sheetUrl?: string;
    sheetId?: string;
    message?: string;
    isDuplicate?: boolean;
    existingSheetUrl?: string;
    suggestedName?: string;
};

export type DriveScopesResponse = {
    hasScopes: boolean;
    missingScopes: string[];
    grantedScopes: string[];
};
