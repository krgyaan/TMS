import { BaseApiService } from './base.service';
import type { HappyCallingRow, HappyCallingListParams, UpdateHappyCallingDto } from '@/modules/crm/happy-calling/helpers/happy-calling.types';
import type { PaginatedResult } from '@/types/api.types';

class HappyCallingService extends BaseApiService {
    constructor() {
        super('/happy-calling');
    }

    async getAll(params?: HappyCallingListParams): Promise<PaginatedResult<HappyCallingRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        if (params?.search) search.set('search', params.search);
        const queryString = search.toString();
        return this.get<PaginatedResult<HappyCallingRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<HappyCallingRow> {
        return this.get<HappyCallingRow>(`/${id}`);
    }

    async update(id: number, data: UpdateHappyCallingDto): Promise<HappyCallingRow> {
        return this.patch<HappyCallingRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const happyCallingService = new HappyCallingService();