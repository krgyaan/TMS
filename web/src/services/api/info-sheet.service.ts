import { BaseApiService } from './base.service'
import type { SaveTenderInfoSheetDto, TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types'

class InfoSheetsService extends BaseApiService {
    constructor() {
        super('/tender-info-sheets')
    }

    async getByTenderId(tenderId: number): Promise<TenderInfoSheetResponse> {
        return this.get<TenderInfoSheetResponse>(`/${tenderId}`)
    }

    async getTenderContacts(tenderId: number): Promise<{ organisationName: string; contacts: Array<{ name: string; phone: string | null; email: string | null }> }> {
        return this.get(`/${tenderId}/contacts`)
    }

    async create(tenderId: number, data: SaveTenderInfoSheetDto): Promise<TenderInfoSheetResponse> {
        return this.post<TenderInfoSheetResponse, SaveTenderInfoSheetDto>(`/${tenderId}`, data)
    }

    async update(tenderId: number, data: SaveTenderInfoSheetDto): Promise<TenderInfoSheetResponse> {
        return this.patch<TenderInfoSheetResponse, SaveTenderInfoSheetDto>(`/${tenderId}`, data)
    }

    async autoExtract(tenderId: number): Promise<{ jobId: string; status: string; message: string }> {
        return this.post<{ jobId: string; status: string; message: string }>(`/${tenderId}/auto-extract`)
    }

    async getAutoExtractStatus(jobId: string): Promise<{
        jobId: string;
        status: 'processing' | 'completed' | 'failed';
        state?: string;
        progress?: unknown;
        fields?: Record<string, { value: unknown; confidence: string; source: string | null }>;
        missing_fields?: string[];
        extraction_version?: string;
        processing_time_ms?: number;
    }> {
        return this.get(`/auto-extract/${jobId}`)
    }
}

export const infoSheetsService = new InfoSheetsService()
