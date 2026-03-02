import { z } from 'zod';
import { RequestExtensionFormSchema } from './requestExtension.schema';

// Form Values Type
export type RequestExtensionFormValues = z.infer<typeof RequestExtensionFormSchema>;

export interface RequestExtensionResponse {
    id: number;
    tenderId: number;
    days: number;
    reason: string;
    clients: number[];
    createdAt?: string;
    updatedAt?: string;
}

export interface RequestExtensionListRow {
    id: number;
    tenderId: number;
    tenderName: string;
    tenderNo: string;
    tenderDue: string;
    days: number;
    reason: string;
    clients: number[];
    createdAt?: string | null;
    updatedAt?: string | null;
}

// Create DTO
export interface CreateRequestExtensionDto {
    tenderId: number;
    days: number;
    reason: string;
    clients: number[];
}

// Update DTO
export interface UpdateRequestExtensionDto {
    id: number;
    tenderId?: number;
    days?: number;
    reason?: string;
    clients?: number[];
}

// List params
export interface RequestExtensionListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}
