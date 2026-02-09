import type {
    FinanceDocumentFormValues,
    FinanceDocumentResponse,
    CreateFinanceDocumentDto,
    UpdateFinanceDocumentDto,
} from './financeDocument.types';

// Build default values (for create mode)
export const buildDefaultValues = (): FinanceDocumentFormValues => {
    return {
        documentName: '',
        documentType: undefined as any,
        financialYear: undefined as any,
        uploadFile: null as any,
    };
};

// Map API response to form values (for edit mode)
export const mapResponseToForm = (
    existingData: FinanceDocumentResponse | null
): FinanceDocumentFormValues => {
    if (!existingData) {
        return buildDefaultValues();
    }

    return {
        documentName: existingData.documentName,
        documentType: existingData.documentType,
        financialYear: existingData.financialYear,
        uploadFile: existingData.uploadFile || null,
    };
};

// Helper to convert file uploads to string paths
const convertFileToPath = (file: File | File[] | string | string[] | null | undefined): string | undefined => {
    if (!file) return undefined;
    if (typeof file === 'string') return file;
    if (Array.isArray(file)) {
        if (file.length === 0) return undefined;
        // If array of strings, return first one
        if (typeof file[0] === 'string') return file[0];
        // If array of Files, we'll need to upload them first - for now return undefined
        return undefined;
    }
    if (file instanceof File) {
        // File object needs to be uploaded first - for now return undefined
        return undefined;
    }
    return undefined;
};

// Map form values to Create DTO
export const mapFormToCreatePayload = (values: FinanceDocumentFormValues): CreateFinanceDocumentDto => {
    return {
        documentName: values.documentName,
        documentType: values.documentType,
        financialYear: values.financialYear,
        uploadFile: convertFileToPath(values.uploadFile),
    };
};

// Map form values to Update DTO
export const mapFormToUpdatePayload = (
    id: number,
    values: FinanceDocumentFormValues
): UpdateFinanceDocumentDto => {
    return {
        id,
        documentName: values.documentName,
        documentType: values.documentType,
        financialYear: values.financialYear,
        uploadFile: convertFileToPath(values.uploadFile),
    };
};
