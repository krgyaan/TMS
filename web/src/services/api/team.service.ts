import { BaseApiService } from './base.service';
import type { Team, CreateTeamDto, UpdateTeamDto } from '@/types/api.types';

class TeamsService extends BaseApiService {
    constructor() {
        super('/teams');
    }

    async getAll(): Promise<Team[]> {
        return this.get<Team[]>('');
    }

    async getById(id: number): Promise<Team> {
        return this.get<Team>(`/${id}`);
    }

    async create(data: CreateTeamDto): Promise<Team> {
        return this.post<Team>('', data);
    }

    async update(id: number, data: UpdateTeamDto): Promise<Team> {
        return this.patch<Team>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<Team[]> {
        return this.get<Team[]>('/search', { params: { q: query } });
    }
}

export const teamsService = new TeamsService();
