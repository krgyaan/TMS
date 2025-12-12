import { BaseApiService } from './base.service';
import type {
    Designation,
    CreateDesignationDto,
    UpdateDesignationDto,
} from '@/types/api.types';

class DesignationsService extends BaseApiService {
    constructor() {
        super('/designations');
    }

    async getAll(): Promise<Designation[]> {
        return this.get<Designation[]>('');
    }

    async getById(id: number): Promise<Designation> {
        return this.get<Designation>(`/${id}`);
    }

    async create(data: CreateDesignationDto): Promise<Designation> {
        return this.post<Designation>('', data);
    }

    async update(
        id: number,
        data: UpdateDesignationDto,
    ): Promise<Designation> {
        return this.patch<Designation>(`/${id}`, data);
    }

    async deleteDesignation(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    // async search(query: string): Promise<Designation[]> {
    //     return this.get<Designation[]>('/search', { params: { q: query } });
    // }
}

export const designationsService = new DesignationsService();
