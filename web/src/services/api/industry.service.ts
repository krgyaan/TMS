import { BaseApiService } from './base.service';
import type { Industry, CreateIndustryDto, UpdateIndustryDto } from '@/types/api.types';

class IndustriesService extends BaseApiService {
    constructor() {
        super('/industries');
    }

    async getAll(): Promise<Industry[]> {
        return this.get<Industry[]>('');
    }

    async getById(id: number): Promise<Industry> {
        return this.get<Industry>(`/${id}`);
    }

    async create(data: CreateIndustryDto): Promise<Industry> {
        return this.post<Industry>('', data);
    }

    async update(id: number, data: UpdateIndustryDto): Promise<Industry> {
        return this.patch<Industry>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<Industry[]> {
        return this.get<Industry[]>('/search', { params: { q: query } });
    }
}

export const industriesService = new IndustriesService();
