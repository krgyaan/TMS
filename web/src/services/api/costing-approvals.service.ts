import { BaseApiService } from './base.service';
import type {
    CostingSheetWithDetails,
    CostingApprovalDashboardCounts,
    CostingApprovalListParams,
    CostingApprovalDashboardRow,
    ApproveCostingDto,
    RejectCostingDto,
    UpdateApprovedCostingDto,
    ApproveAllCostingDto,
} from '@/modules/tendering/costing-approvals/helpers/costingApproval.types';
import type { PaginatedResult } from '@/types/api.types';


class CostingApprovalsService extends BaseApiService {
    constructor() {
        super('/costing-approvals');
    }

    async getAll(
        params?: CostingApprovalListParams,
        teamId?: number
    ): Promise<PaginatedResult<CostingApprovalDashboardRow>> {
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
        return this.get<PaginatedResult<CostingApprovalDashboardRow>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getById(id: number): Promise<CostingSheetWithDetails> {
        return this.get<CostingSheetWithDetails>(`/${id}`);
    }

    async approve(id: number, data: ApproveCostingDto): Promise<any> {
        return this.post<any>(`/${id}/approve`, data);
    }

    async approveAll(id: number, data: ApproveAllCostingDto): Promise<any> {
        return this.post<any>(`/${id}/approve-all`, data);
    }

    async reject(id: number, data: RejectCostingDto): Promise<any> {
        return this.post<any>(`/${id}/reject`, data);
    }

    async updateApproved(id: number, data: UpdateApprovedCostingDto): Promise<any> {
        return this.patch<any>(`/${id}`, data);
    }

    async getDashboardCounts(teamId?: number): Promise<CostingApprovalDashboardCounts> {
        const search = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }
        const queryString = search.toString();
        return this.get<CostingApprovalDashboardCounts>(queryString ? `/dashboard/counts?${queryString}` : '/dashboard/counts');
    }
}

export const costingApprovalsService = new CostingApprovalsService();
