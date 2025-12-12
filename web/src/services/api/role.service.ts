import { BaseApiService } from './base.service';
import type { Role, CreateRoleDto, UpdateRoleDto, Permission } from '@/types/api.types';

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

    async getRolePermissions(id: number): Promise<Permission[]> {
        return this.get<Permission[]>(`/${id}/permissions`);
    }

    async deleteRole(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async assignPermissions(roleId: number, permissionIds: number[]): Promise<void> {
        return this.post<void>(`/${roleId}/permissions`, { permissionIds });
    }

    async removePermission(roleId: number, permissionId: number): Promise<void> {
        return this.delete<void>(`/${roleId}/permissions/${permissionId}`);
    }
}

export const rolesService = new RolesService();
