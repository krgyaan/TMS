import { BaseApiService } from './base.service';
import type {
    TenderApproval,
    SaveTenderApprovalDto,
    TenderApprovalRow,
    PaginatedResult,
    TenderApprovalFilters,
    TenderApprovalDashboardCounts,
} from '@/types/api.types';

class TenderApprovalsService extends BaseApiService {
    constructor() {
        super('/tender-approvals');
    }

    async getAll(
        params?: TenderApprovalFilters
    ): Promise<PaginatedResult<TenderApprovalRow>> {
        const search = new URLSearchParams();
        console.log("TESSSST");
        if (params) {
            if (params.tlStatus) search.set('tlStatus', String(params.tlStatus));
            if (params.page) search.set('page', params.page.toString());
            if (params.limit) search.set('limit', params.limit.toString());
            if (params.sortBy) search.set('sortBy', params.sortBy);
            if (params.sortOrder) search.set('sortOrder', params.sortOrder);
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TenderApprovalRow>>(queryString ? `?${queryString}` : '');
    }

    async getByTenderId(tenderId: number): Promise<TenderApproval | null> {
        return this.get<TenderApproval>(`/${tenderId}/approval`);
    }

    async create(tenderId: number, data: SaveTenderApprovalDto): Promise<TenderApproval> {
        return this.post<TenderApproval>(`/${tenderId}/approval`, data);
    }

    async update(tenderId: number, data: SaveTenderApprovalDto): Promise<TenderApproval> {
        return this.put<TenderApproval>(`/${tenderId}/approval`, data);
    }

    async getDashboardCounts(): Promise<TenderApprovalDashboardCounts> {
        return this.get<TenderApprovalDashboardCounts>('/dashboard/counts');
    }
}

export const tenderApprovalsService = new TenderApprovalsService();
