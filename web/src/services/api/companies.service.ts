import { BaseApiService } from './base.service'
import { type Company } from '@/types/api.types'

class CompaniesService extends BaseApiService {
    constructor() {
        super('/companies')
    }

    async getAll(): Promise<Company[]> {
        return this.get<Company[]>()
    }

    async getById(id: string): Promise<Company> {
        return this.get<Company>(`/${id}`)
    }

    async create(data: Partial<Company>): Promise<Company> {
        return this.post<Company>('', data)
    }

    async update(id: string, data: Partial<Company>): Promise<Company> {
        return this.patch<Company>(`/${id}`, data)
    }

    // async delete(id: string): Promise<void> {
    //     return this.delete<void>(`/${id}`)
    // }

    async uploadLogo(id: string, file: File): Promise<Company> {
        const formData = new FormData()
        formData.append('logo', file)
        return this.post<Company>(`/${id}/logo`, formData)
    }
}

export const companiesService = new CompaniesService()
