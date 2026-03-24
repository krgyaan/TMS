import type { PaginatedResponse } from '@/types/api.types';
import { BaseApiService } from './base.service';
import type {
    ContractAgreement,
    ContractAgreementCount,
    UpdateContractAgreementDto,
    ContractAgreementFilters
} from '@/modules/operations/types/wo.types';

class ContractAgreementApiService extends BaseApiService {
    constructor() {
        super('/contract-agreement');
    }

    async getOne(id: number): Promise<ContractAgreement> {
        return this.get(`/${id}`);
    }

    async getAll(params: ContractAgreementFilters, teamId?: number): Promise<PaginatedResponse<ContractAgreement>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.tab) {
                search.set('tab', String(params.tab));
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
        return this.get<PaginatedResponse<ContractAgreement>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getDashboardCounts(teamId?: number) {
        const search = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }
        const queryString = search.toString();
        return this.get<ContractAgreementCount>(queryString ? `/dashboard/counts?${queryString}` : '/dashboard/counts');
    }

    async getByWoDetailId(woDetailId: number): Promise<ContractAgreement | null> {
        return this.get<ContractAgreement>(`/wo-detail/${woDetailId}`);
    }

    async updateContractAgreement(id: number, data: UpdateContractAgreementDto): Promise<ContractAgreement> {
        return this.patch<ContractAgreement>(`/${id}`, data);
    }
}

export const contractAgreementApi = new ContractAgreementApiService();
