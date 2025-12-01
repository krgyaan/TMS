import { BaseApiService } from './base.service';
import type { LeadType, CreateLeadTypeDto, UpdateLeadTypeDto } from '@/types/api.types';

class LeadTypesService extends BaseApiService {
    constructor() {
        super('/lead-types');
    }

    async getAll(): Promise<LeadType[]> {
        return this.get<LeadType[]>('');
    }

    async getById(id: number): Promise<LeadType> {
        return this.get<LeadType>(`/${id}`);
    }

    async create(data: CreateLeadTypeDto): Promise<LeadType> {
        return this.post<LeadType>('', data);
    }

    async update(id: number, data: UpdateLeadTypeDto): Promise<LeadType> {
        return this.patch<LeadType>(`/${id}`, data);
    }

    // async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    // }

    // async search(query: string): Promise<LeadType[]> {
    //     return this.get<LeadType[]>('/search', { params: { q: query } });
    // }
}

export const leadTypesService = new LeadTypesService();
