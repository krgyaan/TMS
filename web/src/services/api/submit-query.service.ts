import type { CreateSubmitQueryPayload, SubmitQueryListParams, SubmitQueryListRow, UpdateSubmitQueryPayload } from '@/modules/tendering/submit-queries/helpers/submitQueries.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';

class SubmitQueryService extends BaseApiService {
    constructor() {
        super('/submit-queries');
    }

    async getAll(params?: SubmitQueryListParams): Promise<PaginatedResult<SubmitQueryListRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        if (params?.search) search.set('search', params.search);
        const queryString = search.toString();
        return this.get<PaginatedResult<SubmitQueryListRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<SubmitQueryListRow> {
        return this.get<SubmitQueryListRow>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<SubmitQueryListRow | null> {
        return this.get<SubmitQueryListRow | null>(`/tender/${tenderId}`);
    }

    async create(data: CreateSubmitQueryPayload): Promise<SubmitQueryListRow> {
        return this.post<SubmitQueryListRow>('', data);
    }

    async update(id: number, data: Omit<UpdateSubmitQueryPayload, 'id'>): Promise<SubmitQueryListRow> {
        return this.patch<SubmitQueryListRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const submitQueryService = new SubmitQueryService();
