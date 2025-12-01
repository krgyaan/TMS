import { BaseApiService } from './base.service';
import type { Website, CreateWebsiteDto, UpdateWebsiteDto } from '@/types/api.types';

class WebsitesService extends BaseApiService {
    constructor() {
        super('/websites');
    }

    async getAll(): Promise<Website[]> {
        return this.get<Website[]>('');
    }

    async getById(id: number): Promise<Website> {
        return this.get<Website>(`/${id}`);
    }

    async create(data: CreateWebsiteDto): Promise<Website> {
        return this.post<Website>('', data);
    }

    async update(id: number, data: UpdateWebsiteDto): Promise<Website> {
        return this.patch<Website>(`/${id}`, data);
    }

    // async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    // }

    // async search(query: string): Promise<Website[]> {
    //     return this.get<Website[]>('/search', { params: { q: query } });
    // }
}

export const websitesService = new WebsitesService();
