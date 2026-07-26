import type { Permission } from '@/types/api.types'
import { BaseApiService } from './base.service'

class PermissionsService extends BaseApiService {
    constructor() {
        super('/permissions')
    }

    async getAll(): Promise<Permission[]> {
        return this.get<Permission[]>('')
    }

    async getById(id: number): Promise<Permission> {
        return this.get<Permission>(`/${id}`)
    }

    async create(data: CreatePermissionDto): Promise<Permission> {
        return this.post<Permission>('', data)
    }

    async bulkCreate(data: BulkCreatePermissionDto): Promise<Permission[]> {
        return this.post<Permission[]>('/bulk', data)
    }

    async deletePermission(id: number): Promise<void> {
        return this.delete<void>(`/${id}`)
    }
}

export interface CreatePermissionDto {
    module: string
    action: string
    description?: string
}

export interface BulkCreatePermissionDto {
    module: string
    actions: string[]
    description?: string
}

export const permissionsService = new PermissionsService()
