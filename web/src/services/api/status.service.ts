import { BaseApiService } from './base.service'
import type { Status } from '@/types/api.types'

class StatusesService extends BaseApiService {
    constructor() {
        super('/statuses')
    }

    async getAll(): Promise<Status[]> {
        return (await this.get<Status[]>())
    }

    async getById(id: number): Promise<Status> {
        return this.get<Status>(`/${id}`)
    }

    async create(data: Partial<Status>): Promise<Status> {
        return this.post<Status>('', data)
    }

    async update(id: number, data: Partial<Status>): Promise<Status> {
        return this.patch<Status>(`/${id}`, data)
    }

    async deleteStatus(id: number): Promise<void> {
        return this.delete<void>(`/${id}`)
    }
}

export const statusesService = new StatusesService()
