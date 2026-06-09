import { BaseApiService } from './base.service';
import type { ClientDirectoryRow, ClientDirectoryListParams, CreateClientDirectoryDto, UpdateClientDirectoryDto } from '@/modules/shared/client-directory/helpers/client-directory.types';
import type { PaginatedResult } from '@/types/api.types';

class ClientDirectoryService extends BaseApiService {
    constructor() {
        super('/client-directory');
    }

    async getAll(params?: ClientDirectoryListParams): Promise<PaginatedResult<ClientDirectoryRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        if (params?.search) search.set('search', params.search);
        const queryString = search.toString();
        return this.get<PaginatedResult<ClientDirectoryRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<ClientDirectoryRow> {
        return this.get<ClientDirectoryRow>(`/${id}`);
    }

    async create(data: CreateClientDirectoryDto): Promise<ClientDirectoryRow> {
        return this.post<ClientDirectoryRow>('', data);
    }

    async update(id: number, data: UpdateClientDirectoryDto): Promise<ClientDirectoryRow> {
        return this.patch<ClientDirectoryRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }

    async syncAll(): Promise<{ synced: number }> {
        return this.post<{ synced: number }>('/sync-all');
    }
}

export const clientDirectoryService = new ClientDirectoryService();
