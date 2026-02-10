import type {
    FinanceDocumentFormValues,
    FinanceDocumentResponse,
    FinanceDocumentListRow,
    CreateFinanceDocumentDto,
    UpdateFinanceDocumentDto,
} from './financeDocument.types';

// Build default values (for create mode)
export const buildDefaultValues = (): FinanceDocumentFormValues => {
    return {
        documentName: '',
        documentType: undefined as any,
        financialYear: undefined as any,
        uploadFile: [],
    };
};

const toNumber = (v: string | number | null | undefined): number =>
    typeof v === 'number' ? v : v != null ? Number(v) : 0;

// Map API response to form values (for edit mode). Accepts both response and list row (API returns list row shape).
export const mapResponseToForm = (
    existingData: FinanceDocumentResponse | FinanceDocumentListRow | null
): FinanceDocumentFormValues => {
    if (!existingData) {
        return buildDefaultValues();
    }

    const doc = existingData as FinanceDocumentListRow & { documentType?: number; financialYear?: number };
    return {
        documentName: doc.documentName ?? '',
        documentType: toNumber(doc.documentType),
        financialYear: toNumber(doc.financialYear),
        uploadFile: doc.uploadFile ? [doc.uploadFile] : [],
    };
};

// First path from TenderFileUploader array (API accepts single path per field)
const firstPath = (paths: string[]): string | undefined => paths?.[0];

// Map form values to Create DTO
export const mapFormToCreatePayload = (values: FinanceDocumentFormValues): CreateFinanceDocumentDto => {
    return {
        documentName: values.documentName,
        documentType: values.documentType,
        financialYear: values.financialYear,
        uploadFile: firstPath(values.uploadFile),
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
        uploadFile: firstPath(values.uploadFile),
    };
};
