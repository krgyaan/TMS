import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type {
    CostingSheetListParams, TenderCostingSheet, CostingSheetDashboardRow,
    SubmitCostingSheetDto, UpdateCostingSheetDto, CostingSheetDashboardCounts,
    CreateSheetResponse, DriveScopesResponse,
    TenderCostingDetail, CreateCostingDetailDto, CombinedPricing,
} from '@/modules/tendering/costing-sheets/helpers/costingSheet.types';

class CostingSheetsService extends BaseApiService {
    constructor() {
        super('/costing-sheets');
    }

    async getAll(params?: CostingSheetListParams, teamId?: number): Promise<PaginatedResult<CostingSheetDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.tab) {
                search.set('tab', params.tab);
            }
            if (params.page) {
                search.set('page', String(params.page));
            }
            if (params.limit) {
                search.set('limit', String(params.limit));
            }
            if (params.sortBy) {
                search.set('sortBy', params.sortBy);
            }
            if (params.sortOrder) {
                search.set('sortOrder', params.sortOrder);
            }
            if (params.search) {
                search.set('search', params.search);
            }
        }
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<CostingSheetDashboardRow>>(`/dashboard${queryString ? `?${queryString}` : ''}`);
    }

    async getById(id: number): Promise<TenderCostingSheet> {
        return this.get<TenderCostingSheet>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<any | null> {
        return this.get<any>(`/tender/${tenderId}`);
    }

    async submit(data: SubmitCostingSheetDto | any): Promise<any> {
        return this.post<any>('', data);
    }

    async update(id: number, data: UpdateCostingSheetDto | any): Promise<any> {
        return this.patch<any>(`/${id}`, data);
    }

    async getDashboardCounts(teamId?: number): Promise<CostingSheetDashboardCounts> {
        const search = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }
        const queryString = search.toString();
        return this.get<CostingSheetDashboardCounts>(queryString ? `/dashboard/counts?${queryString}` : '/dashboard/counts');
    }

    async checkDriveScopes(): Promise<DriveScopesResponse> {
        return this.get<DriveScopesResponse>('/check-drive-scopes');
    }

    async createSheet(tenderId: number): Promise<CreateSheetResponse> {
        return this.post<CreateSheetResponse>('/create-sheet', { tenderId });
    }

    async createSheetWithName(tenderId: number, customName: string): Promise<CreateSheetResponse> {
        return this.post<CreateSheetResponse>('/create-sheet-with-name', { tenderId, customName });
    }

    // --- Detail methods (route through costing-sheets endpoints) ---

    async getDetailsByTender(tenderId: number): Promise<TenderCostingDetail[]> {
        const sheet = await this.getByTenderId(tenderId);
        return (sheet as any)?.details || [];
    }

    async getDetailById(id: number): Promise<TenderCostingDetail> {
        return this.get<TenderCostingDetail>(`/${id}`);
    }

    async getCombinedPricing(tenderId: number): Promise<CombinedPricing> {
        return this.get<CombinedPricing>(`/tender/${tenderId}/combined`);
    }

    async addDetail(sheetId: number, data: CreateCostingDetailDto): Promise<TenderCostingDetail> {
        return this.post<TenderCostingDetail>(`/${sheetId}/add-detail`, data);
    }

    async removeDetail(sheetId: number, detailId: number): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${sheetId}/details/${detailId}`);
    }
}

export const costingSheetsService = new CostingSheetsService();
