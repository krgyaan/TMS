import { BaseApiService } from './base.service';
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/types/api.types';

class RolesService extends BaseApiService {
    constructor() {
        super('/roles');
    }

    async getAll(): Promise<Role[]> {
        return this.get<Role[]>('');
    }

    async getById(id: number): Promise<Role> {
        return this.get<Role>(`/${id}`);
    }

    async create(data: CreateRoleDto): Promise<Role> {
        return this.post<Role>('', data);
    }

    async update(id: number, data: UpdateRoleDto): Promise<Role> {
        return this.patch<Role>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<Role[]> {
        return this.get<Role[]>('/search', { params: { q: query } });
    }
}

export const rolesService = new RolesService();
