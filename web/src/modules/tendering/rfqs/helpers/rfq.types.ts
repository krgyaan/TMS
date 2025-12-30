import type { Rfq, RfqDashboardRow } from '@/types/api.types';
import type { RfqFormValues } from './rfq.schema';

/**
 * Props for RfqForm component
 */
export interface RfqFormProps {
    tenderData: RfqDashboardRow; // Contains tenderNo, tenderName, rfqTo, etc.
    initialData?: Rfq; // For Edit Mode
}

// Re-export form value types
export type { RfqFormValues };
