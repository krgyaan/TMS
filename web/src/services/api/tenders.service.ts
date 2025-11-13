import { BaseApiService } from './base.service'
import type { CreateTenderInfoDto, TenderInfo, TenderInfoWithNames, UpdateTenderInfoDto } from '@/types/api.types'

type TenderListParams = {
    statusIds?: number[]
    unallocated?: boolean
}

class TenderInfosService extends BaseApiService {
    constructor() {
        super('/tenders')
    }

    async getAll(params?: TenderListParams): Promise<TenderInfoWithNames[]> {
        if (!params || (!params.statusIds?.length && !params.unallocated)) {
            return this.get<TenderInfoWithNames[]>('')
        }
        const search = new URLSearchParams()
        if (params.statusIds?.length) search.set('statusIds', params.statusIds.join(','))
        if (params.unallocated) search.set('unallocated', 'true')
        return this.get<TenderInfoWithNames[]>(`?${search.toString()}`)
    }

    async getById(id: number): Promise<TenderInfoWithNames> {
        return this.get<TenderInfoWithNames>(`/${id}`)
    }

    async create(data: CreateTenderInfoDto): Promise<TenderInfo> {
        return this.post<TenderInfo>('', data)
    }

    async update(id: number, data: UpdateTenderInfoDto): Promise<TenderInfo> {
        return this.patch<TenderInfo>(`/${id}`, data)
    }

    async remove(id: number): Promise<void> {
        return super.delete<void>(`/${id}`)
    }
}

export const tenderInfosService = new TenderInfosService()
