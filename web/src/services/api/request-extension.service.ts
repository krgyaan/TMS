import type { CreateRequestExtensionDto, RequestExtensionListParams, RequestExtensionListRow, RequestExtensionResponse, UpdateRequestExtensionDto } from '@/modules/tendering/request-extension/helpers/requestExtension.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';

class RequestExtensionService extends BaseApiService {
    constructor() {
        super('/request-extensions');
    }

    async getAll(params?: RequestExtensionListParams): Promise<PaginatedResult<RequestExtensionListRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
        if (params?.search) search.set('search', params.search);
        const queryString = search.toString();
        return this.get<PaginatedResult<RequestExtensionListRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<RequestExtensionListRow> {
        return this.get<RequestExtensionListRow>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<RequestExtensionResponse | null> {
        return this.get<RequestExtensionResponse | null>(`/tender/${tenderId}`);
    }

    async create(data: CreateRequestExtensionDto): Promise<RequestExtensionListRow> {
        return this.post<RequestExtensionListRow>('', data);
    }

    async update(id: number, data: Omit<UpdateRequestExtensionDto, 'id'>): Promise<RequestExtensionListRow> {
        return this.patch<RequestExtensionListRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const requestExtensionService = new RequestExtensionService();
