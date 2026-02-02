import { BaseApiService } from './base.service';
import type {
    TenderCostingSheet,
    CostingApprovalDashboardCounts,
    CostingApprovalListParams,
    CostingApprovalDashboardRow,
    ApproveCostingDto,
    RejectCostingDto,
} from '@/modules/tendering/costing-approvals/helpers/costingApproval.types';
import type { PaginatedResult } from '@/types/api.types';


class CostingApprovalsService extends BaseApiService {
    constructor() {
        super('/costing-approvals');
    }

    async getAll(
        params?: CostingApprovalListParams
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

        const queryString = search.toString();
        return this.get<PaginatedResult<CostingApprovalDashboardRow>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getById(id: number): Promise<TenderCostingSheet> {
        return this.get<TenderCostingSheet>(`/${id}`);
    }

    async approve(id: number, data: ApproveCostingDto): Promise<TenderCostingSheet> {
        return this.post<TenderCostingSheet>(`/${id}/approve`, data);
    }

    async reject(id: number, data: RejectCostingDto): Promise<TenderCostingSheet> {
        return this.post<TenderCostingSheet>(`/${id}/reject`, data);
    }

    async updateApproved(id: number, data: ApproveCostingDto): Promise<TenderCostingSheet> {
        return this.patch<TenderCostingSheet>(`/${id}`, data);
    }

    async getDashboardCounts(): Promise<CostingApprovalDashboardCounts> {
        return this.get<CostingApprovalDashboardCounts>('/dashboard/counts');
    }
}

export const costingApprovalsService = new CostingApprovalsService();
