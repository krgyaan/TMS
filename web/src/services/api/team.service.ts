import type { CreateTeamDto, UpdateTeamDto } from '@/types/api.types';
import { BaseApiService } from './base.service';
import type { Team } from '@/types/auth.types';

class TeamService extends BaseApiService {
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
}

export const teamService = new TeamService();
