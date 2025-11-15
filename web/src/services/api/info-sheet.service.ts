import { BaseApiService } from './base.service'
import type { SaveTenderInfoSheetDto, TenderInfoSheet } from '@/types/api.types'

class InfoSheetsService extends BaseApiService {
    constructor() {
        super('/tender-info-sheets')
    }

    async getByTenderId(tenderId: number): Promise<TenderInfoSheet> {
        return this.get<TenderInfoSheet>(`/${tenderId}`)
    }

    async create(tenderId: number, data: SaveTenderInfoSheetDto): Promise<TenderInfoSheet> {
        return this.post<TenderInfoSheet, SaveTenderInfoSheetDto>(`/${tenderId}`, data)
    }

}

export const infoSheetsService = new InfoSheetsService()
