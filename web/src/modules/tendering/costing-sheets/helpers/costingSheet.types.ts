import type { TenderCostingSheet } from '@/types/api.types';
import type { CostingSheetFormValues } from './costingSheet.schema';

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

// Re-export form value types
export type { CostingSheetFormValues };
