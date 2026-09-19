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

    async autoExtract(tenderId: number, force?: boolean): Promise<{
        jobId: string;
        status: string;
        message?: string;
        fields?: Record<string, import('@/modules/tendering/info-sheet/helpers/tenderInfoSheet.autoExtract').ExtractedField>;
        missing_fields?: string[];
        self_classified_atc?: boolean;
        has_atc?: boolean;
        ambiguous_field_conflicts?: Record<string, any>;
        processing_time_ms?: number;
    }> {
        return this.post(`/${tenderId}/auto-extract`, { force })
    }

    async getSavedExtraction(tenderId: number): Promise<{
        tenderId: number;
        fields: Record<string, import('@/modules/tendering/info-sheet/helpers/tenderInfoSheet.autoExtract').ExtractedField>;
        missing_fields: string[];
        extraction_version: string;
        processing_time_ms: number;
        updatedAt: string;
        self_classified_atc?: boolean;
        has_atc?: boolean;
        ambiguous_field_conflicts?: Record<string, any>;
    } | null> {
        try {
            return await this.get(`/${tenderId}/extraction`)
        } catch {
            return null
        }
    }

    async saveExtraction(
        tenderId: number,
        data: {
            fields: Record<string, unknown>;
            missing_fields?: string[];
            extraction_version?: string;
            processing_time_ms?: number;
            self_classified_atc?: boolean;
            has_atc?: boolean;
            ambiguous_field_conflicts?: Record<string, any>;
        },
    ): Promise<{ success: boolean; tenderId: number; fieldsCount: number; verified: boolean }> {
        return this.post(`/${tenderId}/extraction/save`, data)
    }

    async getAutoExtractStatus(jobId: string): Promise<{
        jobId: string;
        status: 'processing' | 'completed' | 'failed';
        state?: string;
        progress?: unknown;
        fields?: Record<string, import('@/modules/tendering/info-sheet/helpers/tenderInfoSheet.autoExtract').ExtractedField>;
        missing_fields?: string[];
        extraction_version?: string;
        processing_time_ms?: number;
        self_classified_atc?: boolean;
        has_atc?: boolean;
        ambiguous_field_conflicts?: Record<string, any>;
        error?: string;
    }> {
        return this.get(`/auto-extract/${jobId}`)
    }
}

export const infoSheetsService = new InfoSheetsService()
