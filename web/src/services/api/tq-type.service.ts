import { BaseApiService } from './base.service';
import type { TqType, CreateTqTypeDto, UpdateTqTypeDto } from '@/types/api.types';

class TqTypesService extends BaseApiService {
    constructor() {
        super('/tq-types');
    }

    async getAll(): Promise<TqType[]> {
        return this.get<TqType[]>('');
    }

    async getById(id: number): Promise<TqType> {
        return this.get<TqType>(`/${id}`);
    }

    async create(data: CreateTqTypeDto): Promise<TqType> {
        return this.post<TqType>('', data);
    }

    async update(id: number, data: UpdateTqTypeDto): Promise<TqType> {
        return this.patch<TqType>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<TqType[]> {
        return this.get<TqType[]>('/search', { params: { q: query } });
    }
}

export const tqTypesService = new TqTypesService();
