import type {
    MasterProjectFormValues,
    MasterProjectResponse,
    MasterProjectListRow,
    CreateMasterProjectDto,
    UpdateMasterProjectDto,
} from "./masterProject.types";

export const buildDefaultValues = (): MasterProjectFormValues => ({
    teamId: undefined as any,
    organisationId: null,
    itemId: undefined as any,
    locationId: null,
    poNo: "",
    poDate: "",
    poDocument: "",
    performanceCertificate: "",
    performanceDate: "",
    completionDocument: "",
    completionDate: "",
    sapPoDate: "",
    sapPoNo: "",
    tenderId: null,
    enquiryId: null,
});

const toStringOrEmpty = (v: string | null | undefined): string => (v ?? "") as string;

export const mapResponseToForm = (
    existing: MasterProjectResponse | MasterProjectListRow | null,
): MasterProjectFormValues => {
    if (!existing) {
        return buildDefaultValues();
    }

    const row = existing as MasterProjectListRow & { teamId?: number };

    return {
        teamId: (row as any).teamId ?? undefined,
        organisationId: row.organisationId,
        itemId: row.itemId,
        locationId: row.locationId,
        poNo: toStringOrEmpty(row.poNo),
        poDate: toStringOrEmpty(row.poDate),
        poDocument: toStringOrEmpty(row.poDocument),
        performanceCertificate: toStringOrEmpty(row.performanceCertificate),
        performanceDate: toStringOrEmpty(row.performanceDate),
        completionDocument: toStringOrEmpty(row.completionDocument),
        completionDate: toStringOrEmpty(row.completionDate),
        sapPoDate: toStringOrEmpty(row.sapPoDate),
        sapPoNo: toStringOrEmpty(row.sapPoNo),
        tenderId: row.tenderId,
        enquiryId: row.enquiryId,
    };
};

export const mapFormToCreatePayload = (
    values: MasterProjectFormValues,
    teamName: string,
): CreateMasterProjectDto => ({
    teamName,
    organisationId: values.organisationId ?? null,
    itemId: values.itemId,
    locationId: values.locationId ?? null,
    poNo: values.poNo || null,
    poDocument: values.poDocument || null,
    poDate: values.poDate || null,
    performanceCertificate: values.performanceCertificate || null,
    performanceDate: values.performanceDate || null,
    completionDocument: values.completionDocument || null,
    completionDate: values.completionDate || null,
    sapPoDate: values.sapPoDate || null,
    sapPoNo: values.sapPoNo || null,
    tenderId: values.tenderId ?? null,
    enquiryId: values.enquiryId ?? null,
});

export const mapFormToUpdatePayload = (
    id: number,
    values: MasterProjectFormValues,
    teamName: string,
): UpdateMasterProjectDto => ({
    id,
    teamName,
    organisationId: values.organisationId ?? null,
    itemId: values.itemId,
    locationId: values.locationId ?? null,
    poNo: values.poNo || null,
    poDocument: values.poDocument || null,
    poDate: values.poDate || null,
    performanceCertificate: values.performanceCertificate || null,
    performanceDate: values.performanceDate || null,
    completionDocument: values.completionDocument || null,
    completionDate: values.completionDate || null,
    sapPoDate: values.sapPoDate || null,
    sapPoNo: values.sapPoNo || null,
    tenderId: values.tenderId ?? null,
    enquiryId: values.enquiryId ?? null,
});
