import type { DashboardFilters } from '@/modules/bi-dashboard/tender-fee/helpers/tenderFee.types';
import { BaseApiService } from './base.service';
import type { PaginatedResult } from '@/types/api.types';
import type {
    TenderFeeDDDashboardRow,
    TenderFeePortalDashboardRow,
    TenderFeeTransferDashboardRow,
    TenderFeeDDDashboardCounts,
    TenderFeePortalDashboardCounts,
    TenderFeeTransferDashboardCounts,
} from '@/modules/bi-dashboard/tender-fee/helpers/tenderFee.types';

class TenderFeesService extends BaseApiService {
    constructor() {
        super('/tender-fee');
    }

    private buildQuery(params?: DashboardFilters): string {
        const search = new URLSearchParams();
        if (params) {
            if (params.tab) search.set('tab', params.tab);
            if (params.page) search.set('page', String(params.page));
            if (params.limit) search.set('limit', String(params.limit));
            if (params.sortBy) search.set('sortBy', params.sortBy);
            if (params.sortOrder) search.set('sortOrder', params.sortOrder);
            if (params.search) search.set('search', params.search);
            if (params.team) search.set('teamId', String(params.team));
        }
        const qs = search.toString();
        return qs ? `?${qs}` : '';
    }

    async getDDDashboard(params?: DashboardFilters): Promise<PaginatedResult<TenderFeeDDDashboardRow>> {
        return this.get<PaginatedResult<TenderFeeDDDashboardRow>>(`/dd/dashboard${this.buildQuery(params)}`);
    }

    async getDDCounts(): Promise<TenderFeeDDDashboardCounts> {
        return this.get<TenderFeeDDDashboardCounts>('/dd/dashboard/counts');
    }

    async getDDExportData(params?: { tab?: string; team?: number }): Promise<{ data: any[] }> {
        const search = new URLSearchParams();
        if (params?.tab) search.set('tab', params.tab);
        if (params?.team) search.set('teamId', String(params.team));
        const qs = search.toString();
        return this.get<{ data: any[] }>(`/dd/dashboard/export${qs ? `?${qs}` : ''}`);
    }

    async getPortalDashboard(params?: DashboardFilters): Promise<PaginatedResult<TenderFeePortalDashboardRow>> {
        return this.get<PaginatedResult<TenderFeePortalDashboardRow>>(`/portal/dashboard${this.buildQuery(params)}`);
    }

    async getPortalCounts(): Promise<TenderFeePortalDashboardCounts> {
        return this.get<TenderFeePortalDashboardCounts>('/portal/dashboard/counts');
    }

    async getPortalExportData(params?: { tab?: string; team?: number }): Promise<{ data: any[] }> {
        const search = new URLSearchParams();
        if (params?.tab) search.set('tab', params.tab);
        if (params?.team) search.set('teamId', String(params.team));
        const qs = search.toString();
        return this.get<{ data: any[] }>(`/portal/dashboard/export${qs ? `?${qs}` : ''}`);
    }

    async getTransferDashboard(params?: DashboardFilters): Promise<PaginatedResult<TenderFeeTransferDashboardRow>> {
        return this.get<PaginatedResult<TenderFeeTransferDashboardRow>>(`/transfer/dashboard${this.buildQuery(params)}`);
    }

    async getTransferCounts(): Promise<TenderFeeTransferDashboardCounts> {
        return this.get<TenderFeeTransferDashboardCounts>('/transfer/dashboard/counts');
    }

    async getTransferExportData(params?: { tab?: string; team?: number }): Promise<{ data: any[] }> {
        const search = new URLSearchParams();
        if (params?.tab) search.set('tab', params.tab);
        if (params?.team) search.set('teamId', String(params.team));
        const qs = search.toString();
        return this.get<{ data: any[] }>(`/transfer/dashboard/export${qs ? `?${qs}` : ''}`);
    }

    async getById(id: number): Promise<any> {
        return this.get<any>(`/requests/${id}`);
    }

    async getActionFormData(id: number): Promise<any> {
        return this.get<any>(`/instruments/${id}/action-form`);
    }

    async getFollowupData(id: number): Promise<any> {
        return this.get<any>(`/instruments/${id}/followup`);
    }

    async updateAction(id: number, data: any): Promise<any> {
        return this.patch<any, any>(`/instruments/${id}/action`, data);
    }
}

export const tenderFeesService = new TenderFeesService();
