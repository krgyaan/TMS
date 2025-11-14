import { BaseApiService } from './base.service'
import type { ItemHeading } from '@/types/api.types'

class ItemHeadingsService extends BaseApiService {
    constructor() {
        super('/item-headings')
    }

    async getAll(): Promise<ItemHeading[]> {
        return this.get<ItemHeading[]>('')
    }

    async getById(id: number): Promise<ItemHeading> {
        return this.get<ItemHeading>(`/${id}`)
    }

    async create(data: Partial<ItemHeading>): Promise<ItemHeading> {
        return this.post<ItemHeading>('', data)
    }

    async update(id: number, data: Partial<ItemHeading>): Promise<ItemHeading> {
        return this.patch<ItemHeading>(`/${id}`, data)
    }

    async delete(id: number): Promise<void> {
        await super.delete<void>(`/${id}`)
    }
}

export const itemHeadingsService = new ItemHeadingsService()
