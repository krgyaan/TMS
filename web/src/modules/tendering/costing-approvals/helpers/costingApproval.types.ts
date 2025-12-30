import type { TenderCostingSheet } from '@/types/api.types';
import type { CostingApprovalFormValues, CostingRejectionFormValues } from './costingApproval.schema';

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

/**
 * Props for CostingRejectionForm component
 */
export interface CostingRejectionFormProps {
    costingSheet: TenderCostingSheet;
    tenderDetails: TenderDetails;
}

// Re-export form value types
export type { CostingApprovalFormValues, CostingRejectionFormValues };
