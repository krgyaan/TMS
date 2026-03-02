import { z } from "zod";
import { ProjectMasterFormSchema } from "./projectMaster.schema";

export type ProjectMasterFormValues = z.infer<typeof ProjectMasterFormSchema>;

export interface ProjectMasterResponse {
    id: number;
    teamName: string | null;
    organisationId: number | null;
    itemId: number;
    locationId: number | null;
    poNo: string | null;
    projectCode: string | null;
    projectName: string | null;
    poUpload: string[] | null;
    poDate: string | null;
    performanceProof: string[] | null;
    performanceDate: string | null;
    completionProof: string[] | null;
    completionDate: string | null;
    sapPoDate: string | null;
    sapPoNo: string | null;
    tenderId: number | null;
    enquiryId: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ProjectMasterListRow extends ProjectMasterResponse {
    organizationName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
}

export interface CreateProjectMasterDto {
    teamName: string;
    organisationId?: number | null;
    itemId: number;
    locationId?: number | null;
    poNo?: string | null;
    poUpload?: string[] | null;
    poDate?: string | null;
    projectCode?: string | null;
    projectName?: string | null;
    performanceProof?: string[] | null;
    performanceDate?: string | null;
    completionProof?: string[] | null;
    completionDate?: string | null;
    sapPoDate?: string | null;
    sapPoNo?: string | null;
    tenderId?: number | null;
    enquiryId?: number | null;
}

export interface UpdateProjectMasterDto extends Partial<CreateProjectMasterDto> {
    id: number;
}

export interface ProjectMasterListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}
