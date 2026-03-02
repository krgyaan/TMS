import type {
    ProjectMasterFormValues,
    ProjectMasterResponse,
    ProjectMasterListRow,
    CreateProjectMasterDto,
    UpdateProjectMasterDto,
} from "./projectMaster.types";

export const buildDefaultValues = (): ProjectMasterFormValues => ({
    teamName: undefined as any,
    organisationId: undefined as any,
    itemId: undefined as any,
    locationId: undefined as any,
    projectCode: "",
    projectName: "",
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
    existing: ProjectMasterResponse | ProjectMasterListRow | null,
): ProjectMasterFormValues => {
    if (!existing) {
        return buildDefaultValues();
    }

    const row = existing as ProjectMasterListRow & { teamId?: number | null };

    return {
        teamName: (row as any).teamName ?? "",
        organisationId: row.organisationId ?? 0,
        itemId: row.itemId,
        locationId: row.locationId ?? 0,
        poNo: toStringOrEmpty(row.poNo),
        poDate: toStringOrEmpty(row.poDate),
        projectCode: row.projectCode ? row.projectCode : "",
        projectName: row.projectName ? row.projectName : "",
        poUpload: row.poUpload ? [row.poUpload] : [],
        performanceCertificate: row.performanceProof ? [row.performanceProof] : [],
        performanceDate: toStringOrEmpty(row.performanceDate),
        completionDocument: row.completionProof ? [row.completionProof] : [],
        completionDate: toStringOrEmpty(row.completionDate),
        sapPoDate: toStringOrEmpty(row.sapPoDate),
        sapPoNo: toStringOrEmpty(row.sapPoNo),
        tenderId: row.tenderId,
        enquiryId: row.enquiryId,
    };
};

export const mapFormToCreatePayload = (
    values: ProjectMasterFormValues,
    teamName: string,
): CreateProjectMasterDto => ({
    teamName,
    organisationId: values.organisationId ?? null,
    itemId: values.itemId,
    locationId: values.locationId ?? null,
    projectCode: values.projectCode || null,
    projectName: values.projectName || null,
    poNo: values.poNo || null,
    poUpload: firstPath(values.poDocument),
    poDate: values.poDate || null,
    performanceProof: firstPath(values.performanceCertificate),
    performanceDate: values.performanceDate || null,
    completionProof: firstPath(values.completionDocument),
    completionDate: values.completionDate || null,
    sapPoDate: values.sapPoDate || null,
    sapPoNo: values.sapPoNo || null,
    tenderId: values.tenderId ?? null,
    enquiryId: values.enquiryId ?? null,
});

export const mapFormToUpdatePayload = (
    id: number,
    values: ProjectMasterFormValues,
    teamName: string,
): UpdateProjectMasterDto => ({
    id,
    teamName,
    organisationId: values.organisationId ?? null,
    itemId: values.itemId,
    locationId: values.locationId ?? null,
    poNo: values.poNo || null,
    poUpload: firstPath(values.poDocument),
    poDate: values.poDate || null,
    projectCode: values.projectCode || null,
    projectName: values.projectName || null,
    performanceProof: firstPath(values.performanceCertificate),
    performanceDate: values.performanceDate || null,
    completionProof: firstPath(values.completionDocument),
    completionDate: values.completionDate || null,
    sapPoDate: values.sapPoDate || null,
    sapPoNo: values.sapPoNo || null,
    tenderId: values.tenderId ?? null,
    enquiryId: values.enquiryId ?? null,
});
