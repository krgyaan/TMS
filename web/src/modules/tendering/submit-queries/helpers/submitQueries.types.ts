import { z } from 'zod';
import { SubmitQueriesFormSchema } from './submitQueries.schema';

export interface Client {
  org: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Query {
    pageNo: string,
    clauseNo: string,
    queryType: "technical" | "commercial" | "bec" | "price_bid",
    currentStatement: string,
    requestedStatement: string
}

// Form Values Type
export type SubmitQueryFormValues = z.infer<typeof SubmitQueriesFormSchema>;

export interface SubmitQueryResponse {
    id: number;
    tenderId: number;
    queries: Query[];
    clients: Client[];
    createdAt?: string;
    updatedAt?: string;
}

export interface SubmitQueryListRow {
    id: number;
    tenderId: number;
    tenderName: string;
    tenderNo: string;
    tenderDue: string;
    queries: Query[];
    clients: Client[];
    createdAt?: string | null;
    updatedAt?: string | null;
}

// Create DTO
export interface CreateSubmitQueryDto {
    tenderId: number;
    days: number;
    reason: string;
    clients: Client[];
}

// Update DTO
export interface UpdateSubmitQueryDto {
    id: number;
    tenderId?: number;
    queries?: Query[];
    clients?: Client[];
}

// List params
export interface SubmitQueryListParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}
