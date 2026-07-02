import type { PqrFormValues, PqrResponse, PqrListRow, CreatePqrDto, UpdatePqrDto } from './pqr.types';
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
    return {
        teamId: toNumber((existingData).teamId),
        projectName: (existingData.projectName ?? '') as string,
        value: toNumber((existingData).value),
        item: (existingData.item ?? '') as string,
        poDate: (existingData.poDate ?? '') as string,
        uploadPo: existingData.uploadPo ?? [],
        sapGemPoDate: (existingData.sapGemPoDate ?? '') as string,
        uploadSapGemPo: existingData.uploadSapGemPo ?? [],
        completionDate: (existingData.completionDate ?? '') as string,
        uploadCompletion: existingData.uploadCompletion ?? [],
        performanceCertificate: existingData.performanceCertificate ?? [],
        remarks: (existingData.remarks ?? '') as string,
    };
};


// Map form values to Create DTO
export const mapFormToCreatePayload = (values: PqrFormValues): CreatePqrDto => {
    return {
        teamId: values.teamId,
        projectName: values.projectName,
        value: values.value,
        item: values.item,
        poDate: values.poDate,
        uploadPo: values.uploadPo,
        sapGemPoDate: values.sapGemPoDate || null,
        uploadSapGemPo: values.uploadSapGemPo || [],
        completionDate: values.completionDate || null,
        uploadCompletion: values.uploadCompletion || [],
        performanceCertificate: values.performanceCertificate || [],
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
        uploadPo: values.uploadPo,
        sapGemPoDate: values.sapGemPoDate || null,
        uploadSapGemPo: values.uploadSapGemPo || [],
        completionDate: values.completionDate || null,
        uploadCompletion: values.uploadCompletion || [],
        performanceCertificate: values.performanceCertificate || [],
        remarks: values.remarks || undefined,
    };
};
