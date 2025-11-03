import { BaseApiService } from './base.service';
import type {
    FollowupCategory,
    CreateFollowupCategoryDto,
    UpdateFollowupCategoryDto,
} from '@/types/api.types';

class FollowupCategoriesService extends BaseApiService {
    constructor() {
        super('/followup-categories');
    }

    async getAll(): Promise<FollowupCategory[]> {
        return this.get<FollowupCategory[]>('');
    }

    async getById(id: number): Promise<FollowupCategory> {
        return this.get<FollowupCategory>(`/${id}`);
    }

    async create(data: CreateFollowupCategoryDto): Promise<FollowupCategory> {
        return this.post<FollowupCategory>('', data);
    }

    async update(
        id: number,
        data: UpdateFollowupCategoryDto,
    ): Promise<FollowupCategory> {
        return this.patch<FollowupCategory>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<FollowupCategory[]> {
        return this.get<FollowupCategory[]>('/search', { params: { q: query } });
    }
}

export const followupCategoriesService = new FollowupCategoriesService();
