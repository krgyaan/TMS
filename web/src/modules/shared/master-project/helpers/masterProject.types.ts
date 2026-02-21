import { z } from "zod";
import { MasterProjectFormSchema } from "./masterProject.schema";

export type MasterProjectFormValues = z.infer<typeof MasterProjectFormSchema>;

export interface MasterProjectResponse {
    id: number;
    teamName: string | null;
    organisationId: number | null;
    itemId: number;
    locationId: number | null;

    poNo: string | null;
    projectCode: string | null;
    projectName: string | null;

    poDocument: string | null;
    poDate: string | null;

    performanceCertificate: string | null;
    performanceDate: string | null;

    completionDocument: string | null;
    completionDate: string | null;

    sapPoDate: string | null;
    sapPoNo: string | null;

    tenderId: number | null;
    enquiryId: number | null;

    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface MasterProjectListRow extends MasterProjectResponse {
    organizationName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
}

export interface CreateMasterProjectDto {
    teamName: string;
    organisationId?: number | null;
    itemId: number;
    locationId?: number | null;

    poNo?: string | null;
    poDocument?: string | null;
    poDate?: string | null;

    performanceCertificate?: string | null;
    performanceDate?: string | null;

    completionDocument?: string | null;
    completionDate?: string | null;

    sapPoDate?: string | null;
    sapPoNo?: string | null;

    tenderId?: number | null;
    enquiryId?: number | null;
}

export interface UpdateMasterProjectDto extends Partial<CreateMasterProjectDto> {
    id: number;
}

export interface MasterProjectListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}
