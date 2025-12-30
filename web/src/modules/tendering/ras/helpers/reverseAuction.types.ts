import type { ReverseAuction } from '@/types/api.types';
import type { ScheduleRaFormValues, UploadRaResultFormValues } from './reverseAuction.schema';

/**
 * Props for RAResultForm component
 */
export interface RAResultFormProps {
    open: boolean;
    onClose: () => void;
    raId: number;
    raData?: ReverseAuction;
}

// Re-export form value types
export type { ScheduleRaFormValues, UploadRaResultFormValues };
