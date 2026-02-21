import type {
    MasterProjectFormValues,
    MasterProjectResponse,
    MasterProjectListRow,
    CreateMasterProjectDto,
    UpdateMasterProjectDto,
} from "./masterProject.types";

export const buildDefaultValues = (): MasterProjectFormValues => ({
    teamId: undefined as any,
    organisationId: undefined as any,
    itemId: undefined as any,
    locationId: undefined as any,
    poNo: "",
    poDate: "",
    poDocument: [],
    performanceCertificate: [],
    performanceDate: "",
    completionDocument: [],
    completionDate: "",
    sapPoDate: "",
    sapPoNo: "",
    tenderId: null,
    enquiryId: null,
});

const toStringOrEmpty = (v: string | null | undefined): string => (v ?? "") as string;

const firstPath = (paths: string[]): string | null => (paths && paths.length > 0 ? paths[0] : null);

export const mapResponseToForm = (
    existing: MasterProjectResponse | MasterProjectListRow | null,
): MasterProjectFormValues => {
    if (!existing) {
        return buildDefaultValues();
    }

    const row = existing as MasterProjectListRow & { teamId?: number | null };

    return {
        teamId: (row as any).teamId ?? 0,
        organisationId: row.organisationId ?? 0,
        itemId: row.itemId,
        locationId: row.locationId ?? 0,
        poNo: toStringOrEmpty(row.poNo),
        poDate: toStringOrEmpty(row.poDate),
        poDocument: row.poDocument ? [row.poDocument] : [],
        performanceCertificate: row.performanceCertificate ? [row.performanceCertificate] : [],
        performanceDate: toStringOrEmpty(row.performanceDate),
        completionDocument: row.completionDocument ? [row.completionDocument] : [],
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
    poDocument: firstPath(values.poDocument),
    poDate: values.poDate || null,
    performanceCertificate: firstPath(values.performanceCertificate),
    performanceDate: values.performanceDate || null,
    completionDocument: firstPath(values.completionDocument),
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
    poDocument: firstPath(values.poDocument),
    poDate: values.poDate || null,
    performanceCertificate: firstPath(values.performanceCertificate),
    performanceDate: values.performanceDate || null,
    completionDocument: firstPath(values.completionDocument),
    completionDate: values.completionDate || null,
    sapPoDate: values.sapPoDate || null,
    sapPoNo: values.sapPoNo || null,
    tenderId: values.tenderId ?? null,
    enquiryId: values.enquiryId ?? null,
});
