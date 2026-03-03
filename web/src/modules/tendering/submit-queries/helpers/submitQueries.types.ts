import type { QueryType } from './submitQueries.schema';

export interface SubmitQueryListRow {
    id: number;
    tenderId: number;
    tenderName?: string;
    tenderNo?: string;
    clientContacts: ClientContact[];
    queries: QueryItem[];
    createdAt: string;
    updatedAt: string;
}

export interface SubmitQueryResponse {
    id: number;
    tenderId: number;
    tenderName?: string;
    tenderNo?: string;
    clientContacts: ClientContact[];
    queries: QueryItem[];
    createdAt: string;
    updatedAt: string;
}

export interface QueryItem {
    pageNo: string;
    clauseNo: string;
    queryType: QueryType;
    currentStatement: string;
    requestedStatement: string;
}

export interface ClientContact {
    org: string;
    name: string;
    email: string;
    phone: string;
    ccEmails?: string[];
}

export interface CreateSubmitQueryPayload {
    tenderId: number;
    queries: QueryItem[];
    clientContacts: ClientContact[];
}

export interface UpdateSubmitQueryPayload {
    tenderId?: number;
    queries?: QueryItem[];
    clientContacts?: ClientContact[];
}

export interface SubmitQueryListResponse {
    data: SubmitQueryListRow[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface SubmitQueryListParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
