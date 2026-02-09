import { z } from 'zod';
import { PqrFormSchema } from './pqr.schema';

// Form Values Type
export type PqrFormValues = z.infer<typeof PqrFormSchema>;

// Response from API
export interface PqrResponse {
    id: number;
    teamName: number;
    projectName: string;
    value: number;
    item: string;
    poDate: string;
    uploadPo: string | null;
    sapGemPoDate: string;
    uploadSapGemPo: string | null;
    completionDate: string;
    uploadCompletion: string | null;
    uploadPerformanceCertificate: string | null;
    remarks: string | undefined;
    createdAt?: string;
    updatedAt?: string;
}

// Create DTO
export interface CreatePqrDto {
    teamName: number;
    projectName: string;
    value: number;
    item: string;
    poDate: string;
    uploadPo?: string;
    uploadSapGemPo?: string;
    uploadCompletion?: string;
    uploadPerformanceCertificate?: string;
    remarks?: string;
}

// Update DTO
export interface UpdatePqrDto {
    id: number;
    teamName?: number;
    projectName?: string;
    value?: number;
    item?: string;
    poDate?: string;
    uploadPo?: string;
    uploadSapGemPo?: string;
    uploadCompletion?: string;
    uploadPerformanceCertificate?: string;
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
