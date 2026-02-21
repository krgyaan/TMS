import { BaseApiService } from './base.service';
import type {
    FinanceDocumentListRow,
    FinanceDocumentListParams,
    CreateFinanceDocumentDto,
    UpdateFinanceDocumentDto,
} from '@/modules/shared/finance-document/helpers/financeDocument.types';
import type { PaginatedResult } from '@/types/api.types';

class FinanceDocumentsService extends BaseApiService {
    constructor() {
        super('/finance-documents');
    }

    async getAll(params?: FinanceDocumentListParams): Promise<PaginatedResult<FinanceDocumentListRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        if (params?.search) search.set('search', params.search);
        const queryString = search.toString();
        return this.get<PaginatedResult<FinanceDocumentListRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<FinanceDocumentListRow> {
        return this.get<FinanceDocumentListRow>(`/${id}`);
    }

    async create(data: CreateFinanceDocumentDto): Promise<FinanceDocumentListRow> {
        return this.post<FinanceDocumentListRow>('', data);
    }

    async update(id: number, data: Omit<UpdateFinanceDocumentDto, 'id'>): Promise<FinanceDocumentListRow> {
        return this.patch<FinanceDocumentListRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const financeDocumentsService = new FinanceDocumentsService();
