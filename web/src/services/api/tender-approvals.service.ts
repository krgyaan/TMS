import { BaseApiService } from './base.service';
import type {
    TenderApproval,
    SaveTenderApprovalDto,
    TenderApprovalRow,
    TenderApprovalFilters,
    TenderApprovalDashboardCounts,
} from '@/modules/tendering/tender-approval/helpers/tenderApproval.types';
import type { PaginatedResult } from '@/types/api.types';

class TenderApprovalsService extends BaseApiService {
    constructor() {
        super('/tender-approvals');
    }

    async getAll(
        params?: TenderApprovalFilters,
        teamId?: number
    ): Promise<PaginatedResult<TenderApprovalRow>> {
        const search = new URLSearchParams();
        if (params) {
            if (params.tabKey) {
                search.set('tabKey', params.tabKey);
            }
            if (params.page) search.set('page', params.page.toString());
            if (params.limit) search.set('limit', params.limit.toString());
            if (params.sortBy) search.set('sortBy', params.sortBy);
            if (params.sortOrder) search.set('sortOrder', params.sortOrder);
            if (params.search) search.set('search', params.search);
        }
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TenderApprovalRow>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
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

    async getDashboardCounts(teamId?: number): Promise<TenderApprovalDashboardCounts> {
        const params = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            params.append('teamId', teamId.toString());
        }
        const query = params.toString();
        return this.get<TenderApprovalDashboardCounts>(query ? `/dashboard/counts?${query}` : '/dashboard/counts');
    }
}

export const tenderApprovalsService = new TenderApprovalsService();
