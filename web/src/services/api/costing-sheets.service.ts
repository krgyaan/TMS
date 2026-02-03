import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type { CostingSheetListParams, TenderCostingSheet, CostingSheetDashboardRow, SubmitCostingSheetDto, UpdateCostingSheetDto, CostingSheetDashboardCounts, CreateSheetResponse, DriveScopesResponse } from '@/modules/tendering/costing-sheets/helpers/costingSheet.types';

class CostingSheetsService extends BaseApiService {
    constructor() {
        super('/costing-sheets');
    }

    async getAll(params?: CostingSheetListParams): Promise<PaginatedResult<CostingSheetDashboardRow>> {
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

        const queryString = search.toString();
        return this.get<PaginatedResult<CostingSheetDashboardRow>>(`/dashboard${queryString ? `?${queryString}` : ''}`);
    }

    async getById(id: number): Promise<TenderCostingSheet> {
        return this.get<TenderCostingSheet>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<TenderCostingSheet | null> {
        return this.get<TenderCostingSheet>(`/tender/${tenderId}`);
    }

    async submit(data: SubmitCostingSheetDto): Promise<TenderCostingSheet> {
        return this.post<TenderCostingSheet>('', data);
    }

    async update(id: number, data: UpdateCostingSheetDto): Promise<TenderCostingSheet> {
        return this.patch<TenderCostingSheet>(`/${id}`, data);
    }

    async getDashboardCounts(): Promise<CostingSheetDashboardCounts> {
        return this.get<CostingSheetDashboardCounts>('/dashboard/counts');
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
}

export const costingSheetsService = new CostingSheetsService();
