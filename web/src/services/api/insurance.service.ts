import { BaseApiService } from './base.service';
import type { InsuranceCreatePayload, InsurancePolicyDetail, InsurancePolicyRow } from '@/modules/insurance/helpers/insurance.types';
import type { PaginatedResult } from '@/types/api.types';

class InsuranceApiService extends BaseApiService {
    constructor() {
        super('/insurance-policies');
    }

    async getAll(params?: { page?: number; limit?: number; search?: string; status?: string; insuranceType?: string; sortBy?: string; sortOrder?: string }): Promise<PaginatedResult<InsurancePolicyRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.search) search.set('search', params.search);
        if (params?.status) search.set('status', params.status);
        if (params?.insuranceType) search.set('insuranceType', params.insuranceType);
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);

        const queryString = search.toString();
        return this.get<PaginatedResult<InsurancePolicyRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<InsurancePolicyDetail> {
        return this.get<InsurancePolicyDetail>(`/${id}`);
    }

    async getByProject(projectId: number): Promise<InsurancePolicyRow[]> {
        return this.get<InsurancePolicyRow[]>(`/project/${projectId}`);
    }

    async create(data: InsuranceCreatePayload): Promise<InsurancePolicyRow> {
        return this.post<InsurancePolicyRow>('', data);
    }

    async update(id: number, data: Partial<InsuranceCreatePayload>): Promise<InsurancePolicyRow> {
        return this.patch<InsurancePolicyRow>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return this.delete(`/${id}`);
    }
}

export const insuranceService = new InsuranceApiService();