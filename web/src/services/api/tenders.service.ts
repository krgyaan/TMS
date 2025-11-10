import { BaseApiService } from './base.service'
import type { TenderInfoView } from '@/types/api.types'

type TenderListParams = {
    statusIds?: number[]
    unallocated?: boolean
}

class TenderInfosService extends BaseApiService {
    constructor() {
        super('/tenders')
    }

    async getAll(params?: TenderListParams): Promise<TenderInfoView[]> {
        if (!params || (!params.statusIds?.length && !params.unallocated)) {
            return this.get<TenderInfoView[]>('')
        }
        const search = new URLSearchParams()
        if (params.statusIds?.length) search.set('statusIds', params.statusIds.join(','))
        if (params.unallocated) search.set('unallocated', 'true')
        return this.get<TenderInfoView[]>(`?${search.toString()}`)
    }

    async getById(id: number): Promise<TenderInfoView> {
        return this.get<TenderInfoView>(`/${id}`)
    }

    async create(data: Partial<TenderInfoView>): Promise<TenderInfoView> {
        return this.post<TenderInfoView>('', data)
    }

    async update(id: number, data: Partial<TenderInfoView>): Promise<TenderInfoView> {
        return this.patch<TenderInfoView>(`/${id}`, data)
    }

    async remove(id: number): Promise<void> {
        return super.delete<void>(`/${id}`)
    }
}

export const tenderInfosService = new TenderInfosService()
