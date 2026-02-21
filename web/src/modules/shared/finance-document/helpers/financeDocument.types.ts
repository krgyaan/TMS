import { z } from 'zod';
import { FinanceDocumentFormSchema } from './financeDocument.schema';

// Form Values Type
export type FinanceDocumentFormValues = z.infer<typeof FinanceDocumentFormSchema>;

// Response from API
export interface FinanceDocumentResponse {
    id: number;
    documentName: string;
    documentType: number;
    financialYear: number;
    uploadFile: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// List row from API (documentType and financialYear returned as string by backend)
export interface FinanceDocumentListRow {
    id: number;
    documentName: string | null;
    documentType: string;
    financialYear: string;
    uploadFile: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

// Create DTO
export interface CreateFinanceDocumentDto {
    documentName: string;
    documentType: number;
    financialYear: number;
    uploadFile?: string | null;
}

// Update DTO
export interface UpdateFinanceDocumentDto {
    id: number;
    documentName?: string;
    documentType?: number;
    financialYear?: number;
    uploadFile?: string | null;
}

// List params
export interface FinanceDocumentListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}
