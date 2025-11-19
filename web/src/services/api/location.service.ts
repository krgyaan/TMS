import { BaseApiService } from './base.service'
import type { Location } from '@/types/api.types'

class LocationsService extends BaseApiService {
    constructor() {
        super('/locations')
    }

    async getAll(): Promise<Location[]> {
        return (await this.get<Location[]>())
    }

    async getById(id: number): Promise<Location> {
        return this.get<Location>(`/${id}`)
    }

    async create(data: Partial<Location>): Promise<Location> {
        return this.post<Location>('', data)
    }

    async update(id: number, data: Partial<Location>): Promise<Location> {
        return this.patch<Location>(`/${id}`, data)
    }

    async deleteLocation(id: number): Promise<void> {
        return this.delete<void>(`/${id}`)
    }
}

export const locationsService = new LocationsService()
