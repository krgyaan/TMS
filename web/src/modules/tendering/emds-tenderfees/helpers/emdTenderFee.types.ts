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
