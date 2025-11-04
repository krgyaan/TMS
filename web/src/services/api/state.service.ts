import { BaseApiService } from './base.service';
import type { State, CreateStateDto, UpdateStateDto } from '@/types/api.types';

class StatesService extends BaseApiService {
    constructor() {
        super('/states');
    }

    async getAll(): Promise<State[]> {
        return this.get<State[]>('');
    }

    async getById(id: number): Promise<State> {
        return this.get<State>(`/${id}`);
    }

    async create(data: CreateStateDto): Promise<State> {
        return this.post<State>('', data);
    }

    async update(id: number, data: UpdateStateDto): Promise<State> {
        return this.patch<State>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<State[]> {
        return this.get<State[]>('/search', { params: { q: query } });
    }
}

export const statesService = new StatesService();
