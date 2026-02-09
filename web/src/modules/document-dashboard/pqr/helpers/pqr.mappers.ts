import type {
    PqrFormValues,
    PqrResponse,
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
        uploadPo: null as any,
        sapGemPoDate: '',
        uploadSapGemPo: null as any,
        completionDate: '',
        uploadCompletion: null as any,
        uploadPerformanceCertificate: null as any,
        remarks: '',
    };
};

// Map API response to form values (for edit mode)
export const mapResponseToForm = (
    existingData: PqrResponse | null
): PqrFormValues => {
    if (!existingData) {
        return buildDefaultValues();
    }

    return {
        teamName: existingData.teamName,
        projectName: existingData.projectName,
        value: existingData.value,
        item: existingData.item,
        poDate: existingData.poDate,
        uploadPo: existingData.uploadPo as string | null,
        sapGemPoDate: existingData.sapGemPoDate,
        uploadSapGemPo: existingData.uploadSapGemPo as string | null,
        completionDate: existingData.completionDate,
        uploadCompletion: existingData.uploadCompletion as string | null,
        uploadPerformanceCertificate: existingData.uploadPerformanceCertificate as string | null,
        remarks: existingData.remarks || '',
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
export const mapFormToCreatePayload = (values: PqrFormValues): CreatePqrDto => {
    return {
        teamName: values.teamName,
        projectName: values.projectName,
        value: values.value,
        item: values.item,
        poDate: values.poDate,
        uploadPo: convertFileToPath(values.uploadPo),
        uploadSapGemPo: convertFileToPath(values.uploadSapGemPo),
        uploadCompletion: convertFileToPath(values.uploadCompletion),
        uploadPerformanceCertificate: convertFileToPath(values.uploadPerformanceCertificate),
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
        uploadPo: convertFileToPath(values.uploadPo),
        uploadSapGemPo: convertFileToPath(values.uploadSapGemPo),
        uploadCompletion: convertFileToPath(values.uploadCompletion),
        uploadPerformanceCertificate: convertFileToPath(values.uploadPerformanceCertificate),
        remarks: values.remarks || undefined,
    };
};
