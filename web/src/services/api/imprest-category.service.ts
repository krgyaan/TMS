import { BaseApiService } from './base.service';
import type {
    ImprestCategory,
    CreateImprestCategoryDto,
    UpdateImprestCategoryDto,
} from '@/types/api.types';

class ImprestCategoriesService extends BaseApiService {
    constructor() {
        super('/imprest-categories');
    }

    async getAll(): Promise<ImprestCategory[]> {
        return this.get<ImprestCategory[]>('');
    }

    async getById(id: number): Promise<ImprestCategory> {
        return this.get<ImprestCategory>(`/${id}`);
    }

    async create(data: CreateImprestCategoryDto): Promise<ImprestCategory> {
        return this.post<ImprestCategory>('', data);
    }

    async update(
        id: number,
        data: UpdateImprestCategoryDto,
    ): Promise<ImprestCategory> {
        return this.patch<ImprestCategory>(`/${id}`, data);
    }

    // async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    // }

    // async search(query: string): Promise<ImprestCategory[]> {
    //     return this.get<ImprestCategory[]>('/search', { params: { q: query } });
    // }
}

export const imprestCategoriesService = new ImprestCategoriesService();
