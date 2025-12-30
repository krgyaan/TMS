import type { UploadResultFormValues } from './tenderResult.schema';

/**
 * Props for UploadResultFormPage component
 */
export interface UploadResultFormPageProps {
    resultId: number;
    tenderId: number;
}

// Re-export form value types
export type { UploadResultFormValues };
