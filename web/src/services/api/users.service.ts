import { BaseApiService } from "./base.service";
import type { User, CreateUserDto, UpdateUserDto, AssignRoleDto, AssignPermissionsDto, UserPermission, Role } from "@/types/api.types";

class UsersService extends BaseApiService {
    constructor() {
        super("/users");
    }

    async getAll(): Promise<User[]> {
        return this.get<User[]>();
    }

    async getById(id: number): Promise<User> {
        return this.get<User>(`/${id}`);
    }

    async create(data: CreateUserDto): Promise<User> {
        console.log("Creating user with data:", data);
        return this.post("", data);
    }

    async update(id: number, data: UpdateUserDto): Promise<User> {
        return this.patch<User>(`/${id}`, data);
    }

    async deleteUser(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    // User Roles
    async getUserRole(id: number): Promise<Role | null> {
        return this.get<Role>(`/${id}/roles`);
    }

    async assignRole(id: number, data: AssignRoleDto): Promise<{ message: string }> {
        return this.post<{ message: string }>(`/${id}/roles`, data);
    }

    async updateUserRole(id: number, data: AssignRoleDto): Promise<{ message: string }> {
        return this.patch<{ message: string }>(`/${id}/roles`, data);
    }

    // User Permissions
    async getUserPermissions(id: number): Promise<UserPermission[]> {
        return this.get<UserPermission[]>(`/${id}/permissions`);
    }

    async assignPermissions(id: number, data: AssignPermissionsDto): Promise<{ message: string }> {
        return this.post<{ message: string }>(`/${id}/permissions`, data);
    }

    async updateUserPermissions(id: number, data: AssignPermissionsDto): Promise<{ message: string }> {
        return this.patch<{ message: string }>(`/${id}/permissions`, data);
    }

    async removeUserPermission(userId: number, permissionId: number): Promise<void> {
        return this.delete<void>(`/${userId}/permissions/${permissionId}`);
    }

    async getTeamMembers(teamId: number): Promise<User[]> {
        return this.get<User[]>(`/team/${teamId}/members`);
    }

    async getUsersByRole(roleId: number): Promise<User[]> {
        return this.get<User[]>(`/by-role/${roleId}`);
    }
    async register(data: any): Promise<{ message: string }> {
        return this.patch<{ message: string }>("/register", data);
    }
}

export const usersService = new UsersService();
