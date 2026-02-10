import type {
    PqrFormValues,
    PqrResponse,
    PqrListRow,
    CreatePqrDto,
    UpdatePqrDto,
} from './pqr.types';

// Build default values (for create mode)
export const buildDefaultValues = (): PqrFormValues => {
    return {
        teamName: undefined as any,
        projectName: '',
        value: 0,
        item: '',
        poDate: '',
        uploadPo: [],
        sapGemPoDate: '',
        uploadSapGemPo: [],
        completionDate: '',
        uploadCompletion: [],
        uploadPerformanceCertificate: [],
        remarks: '',
    };
};

const toNumber = (v: string | number | null | undefined): number =>
    typeof v === 'number' ? v : v != null ? Number(v) : 0;

// Map API response to form values (for edit mode). Accepts both PqrResponse and PqrListRow (API returns list row shape).
export const mapResponseToForm = (
    existingData: PqrResponse | PqrListRow | null
): PqrFormValues => {
    if (!existingData) {
        return buildDefaultValues();
    }

    return {
        teamName: toNumber((existingData as any).teamName),
        projectName: (existingData.projectName ?? '') as string,
        value: toNumber((existingData as any).value),
        item: (existingData.item ?? '') as string,
        poDate: (existingData.poDate ?? '') as string,
        uploadPo: existingData.uploadPo ? [existingData.uploadPo] : [],
        sapGemPoDate: (existingData.sapGemPoDate ?? '') as string,
        uploadSapGemPo: existingData.uploadSapGemPo ? [existingData.uploadSapGemPo] : [],
        completionDate: (existingData.completionDate ?? '') as string,
        uploadCompletion: existingData.uploadCompletion ? [existingData.uploadCompletion] : [],
        uploadPerformanceCertificate: existingData.uploadPerformanceCertificate ? [existingData.uploadPerformanceCertificate] : [],
        remarks: (existingData.remarks ?? '') as string,
    };
};

// First path from TenderFileUploader array (API accepts single path per field)
const firstPath = (paths: string[]): string | undefined => paths?.[0];

// Map form values to Create DTO
export const mapFormToCreatePayload = (values: PqrFormValues): CreatePqrDto => {
    return {
        teamName: values.teamName,
        projectName: values.projectName,
        value: values.value,
        item: values.item,
        poDate: values.poDate,
        uploadPo: firstPath(values.uploadPo),
        uploadSapGemPo: firstPath(values.uploadSapGemPo),
        uploadCompletion: firstPath(values.uploadCompletion),
        uploadPerformanceCertificate: firstPath(values.uploadPerformanceCertificate),
        remarks: values.remarks || undefined,
    };
};

// Map form values to Update DTO
export const mapFormToUpdatePayload = (
    id: number,
    values: PqrFormValues
): UpdatePqrDto => {
    return {
        id,
        teamName: values.teamName,
        projectName: values.projectName,
        value: values.value,
        item: values.item,
        poDate: values.poDate,
        uploadPo: firstPath(values.uploadPo),
        uploadSapGemPo: firstPath(values.uploadSapGemPo),
        uploadCompletion: firstPath(values.uploadCompletion),
        uploadPerformanceCertificate: firstPath(values.uploadPerformanceCertificate),
        remarks: values.remarks || undefined,
    };
};
