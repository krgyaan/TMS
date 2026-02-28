import type { PqrFormValues, PqrResponse, PqrListRow, CreatePqrDto, UpdatePqrDto } from './pqr.types';

const parsePgTextArray = (value?: string | null): string[] => {
    if (!value) return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        return [trimmed];
    }
    const inner = trimmed.slice(1, -1);
    if (!inner) return [];
    return inner
        .split(",")
        .map((part) => part.trim().replace(/^"(.*)"$/, "$1"))
        .filter((part) => part.length > 0);
};

// Build default values (for create mode)
export const buildDefaultValues = (): PqrFormValues => {
    return {
        teamId: 0,
        projectName: '',
        value: 0,
        item: '',
        poDate: '',
        uploadPo: [],
        sapGemPoDate: '',
        uploadSapGemPo: [],
        completionDate: '',
        uploadCompletion: [],
        performanceCertificate: [],
        remarks: '',
    };
};

const toNumber = (v: string | number | null | undefined): number =>
    typeof v === 'number' ? v : v != null ? Number(v) : 0;

export const mapResponseToForm = (
    existingData: PqrResponse | PqrListRow | null
): PqrFormValues => {
    if (!existingData) {
        return buildDefaultValues();
    }

    const uploadPoFiles = parsePgTextArray(existingData.uploadPo as string | null);
    const uploadSapGemPoFiles = parsePgTextArray(existingData.uploadSapGemPo as string | null);
    const uploadCompletionFiles = parsePgTextArray(existingData.uploadCompletion as string | null);
    const uploadPerformanceCertFiles = parsePgTextArray(
        existingData.performanceCertificate as string | null,
    );

    return {
        teamId: toNumber((existingData).teamId),
        projectName: (existingData.projectName ?? '') as string,
        value: toNumber((existingData).value),
        item: (existingData.item ?? '') as string,
        poDate: (existingData.poDate ?? '') as string,
        uploadPo: uploadPoFiles,
        sapGemPoDate: (existingData.sapGemPoDate ?? '') as string,
        uploadSapGemPo: uploadSapGemPoFiles,
        completionDate: (existingData.completionDate ?? '') as string,
        uploadCompletion: uploadCompletionFiles,
        performanceCertificate: uploadPerformanceCertFiles,
        remarks: (existingData.remarks ?? '') as string,
    };
};

// First path from TenderFileUploader array (API accepts single path per field)
const firstPath = (paths: string[]): string | undefined => paths?.[0];

// Map form values to Create DTO
export const mapFormToCreatePayload = (values: PqrFormValues): CreatePqrDto => {
    return {
        teamId: values.teamId,
        projectName: values.projectName,
        value: values.value,
        item: values.item,
        poDate: values.poDate,
        uploadPo: firstPath(values.uploadPo),
        sapGemPoDate: values.sapGemPoDate || null,
        uploadSapGemPo: firstPath(values.uploadSapGemPo),
        completionDate: values.completionDate,
        uploadCompletion: firstPath(values.uploadCompletion),
        performanceCertificate: firstPath(values.performanceCertificate),
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
        teamId: values.teamId,
        projectName: values.projectName,
        value: values.value,
        item: values.item,
        poDate: values.poDate,
        uploadPo: firstPath(values.uploadPo),
        sapGemPoDate: values.sapGemPoDate || null,
        uploadSapGemPo: firstPath(values.uploadSapGemPo),
        completionDate: values.completionDate,
        uploadCompletion: firstPath(values.uploadCompletion),
        performanceCertificate: firstPath(values.performanceCertificate),
        remarks: values.remarks || undefined,
    };
};
