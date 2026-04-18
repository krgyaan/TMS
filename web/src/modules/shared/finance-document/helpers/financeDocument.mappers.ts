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
export function mapResponseToForm(
    response: FinanceDocumentResponse | FinanceDocumentListRow
): FinanceDocumentFormValues {
    // Handle uploadFile which might come as different property names
    let uploadFile: string[] = [];

    if ('uploadFile' in response && response.uploadFile) {
        uploadFile = Array.isArray(response.uploadFile)
            ? response.uploadFile
            : [response.uploadFile];
    } else if ('documentPath' in response && response.documentPath) {
        // Backend might return as documentPath
        const docPath = (response as any).documentPath;
        uploadFile = Array.isArray(docPath) ? docPath : [docPath];
    }

    // Normalize paths
    uploadFile = uploadFile
        .filter(p => p && typeof p === 'string')
        .map(p => p.replace(/\\/g, '/'));

    const result = {
        documentName: response.documentName ?? '',
        documentType: response.documentType != null ? toNumber(response.documentType) : 0,
        financialYear: response.financialYear != null ? toNumber(response.financialYear) : 0,
        uploadFile,
    };

    return result;
}

// Map form values to Create DTO
export const mapFormToCreatePayload = (values: FinanceDocumentFormValues): CreateFinanceDocumentDto => {
    return {
        documentName: values.documentName,
        documentType: values.documentType,
        financialYear: values.financialYear,
        uploadFile: values.uploadFile?.length ? values.uploadFile : undefined,
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
        uploadFile: values.uploadFile?.length ? values.uploadFile : undefined,
    };
};
