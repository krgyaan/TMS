import { z } from 'zod';
import { PqrFormSchema } from './pqr.schema';

// Form Values Type
export type PqrFormValues = z.infer<typeof PqrFormSchema>;

export interface PqrResponse {
    id: number;
    teamId: number;
    teamName: string;
    projectName: string;
    value: number;
    item: string;
    poDate: string;
    uploadPo: string[] | null;
    sapGemPoDate: string | null;
    uploadSapGemPo: string[] | null;
    completionDate: string | null;
    uploadCompletion: string[] | null;
    performanceCertificate: string[] | null;
    remarks: string | undefined;
    createdAt?: string;
    updatedAt?: string;
}

export interface PqrListRow {
    id: number;
    teamId: number;
    teamName: string;
    projectName: string | null;
    value: string;
    item: string | null;
    poDate: string | null;
    uploadPo: string[] | null;
    sapGemPoDate: string | null;
    uploadSapGemPo: string[] | null;
    completionDate: string | null;
    uploadCompletion: string[] | null;
    performanceCertificate: string[] | null;
    remarks: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

// Create DTO
export interface CreatePqrDto {
    teamId: number;
    projectName: string;
    value: number;
    item: string;
    poDate: string;
    uploadPo?: string[];
    sapGemPoDate: string | null;
    uploadSapGemPo?: string[];
    completionDate: string | null;
    uploadCompletion?: string[];
    performanceCertificate?: string[];
    remarks?: string;
}

// Update DTO
export interface UpdatePqrDto {
    id: number;
    teamId?: number;
    projectName?: string;
    value?: number;
    item?: string;
    poDate?: string;
    uploadPo?: string[];
    sapGemPoDate: string | null;
    uploadSapGemPo?: string[];
    uploadCompletion?: string[];
    completionDate: string | null;
    performanceCertificate?: string[];
    remarks?: string;
}

// List params
export interface PqrListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}
