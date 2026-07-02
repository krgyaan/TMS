import { BaseApiService } from './base.service';
import type { PqrListRow, PqrListParams, CreatePqrDto, UpdatePqrDto } from '@/modules/shared/pqr/helpers/pqr.types';
import type { PaginatedResult } from '@/types/api.types';

class PqrService extends BaseApiService {
    constructor() {
        super('/pqr');
    }

    async getAll(params?: PqrListParams): Promise<PaginatedResult<PqrListRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        if (params?.search) search.set('search', params.search);
        const queryString = search.toString();
        return this.get<PaginatedResult<PqrListRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<PqrListRow> {
        return this.get<PqrListRow>(`/${id}`);
    }

    async create(data: CreatePqrDto): Promise<PqrListRow> {
        return this.post<PqrListRow>('', data);
    }

    async update(id: number, data: Omit<UpdatePqrDto, 'id'>): Promise<PqrListRow> {
        return this.patch<PqrListRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const pqrService = new PqrService();
