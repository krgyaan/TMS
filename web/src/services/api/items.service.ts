import { BaseApiService } from './base.service'
import type { Item } from '@/types/api.types'

class ItemsService extends BaseApiService {
    constructor() {
        super('/items')
    }

    async getAll(): Promise<Item[]> {
        return (await this.get<Item[]>())
    }

    async getById(id: number): Promise<Item> {
        return this.get<Item>(`/${id}`)
    }

    async create(data: Partial<Item>): Promise<Item> {
        return this.post<Item>('', data)
    }

    async update(id: number, data: Partial<Item>): Promise<Item> {
        return this.patch<Item>(`/${id}`, data)
    }

    // async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`)
    // }
}

export const itemsService = new ItemsService()
