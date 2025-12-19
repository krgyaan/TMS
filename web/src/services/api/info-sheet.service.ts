import { BaseApiService } from './base.service'
import type { SaveTenderInfoSheetDto, TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types'

class InfoSheetsService extends BaseApiService {
    constructor() {
        super('/tender-info-sheets')
    }

    async getByTenderId(tenderId: number): Promise<TenderInfoSheetResponse> {
        return this.get<TenderInfoSheetResponse>(`/${tenderId}`)
    }

    async create(tenderId: number, data: SaveTenderInfoSheetDto): Promise<TenderInfoSheetResponse> {
        return this.post<TenderInfoSheetResponse, SaveTenderInfoSheetDto>(`/${tenderId}`, data)
    }

    async update(tenderId: number, data: SaveTenderInfoSheetDto): Promise<TenderInfoSheetResponse> {
        return this.patch<TenderInfoSheetResponse, SaveTenderInfoSheetDto>(`/${tenderId}`, data)
    }
}

export const infoSheetsService = new InfoSheetsService()
