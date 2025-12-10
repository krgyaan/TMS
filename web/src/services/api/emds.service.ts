import { BaseApiService } from './base.service';
import type { EmdDashboardResponse, EmdDashboardCounts, CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdateStatusDto, EmdDashboardRow } from '@/types/api.types';
import type { EmdDashboardFilters } from '@/types/api.types';

class EmdsService extends BaseApiService {
    constructor() {
        super('/emds');
    }

    // Dashboard endpoints
    async getDashboard(filters?: EmdDashboardFilters): Promise<EmdDashboardResponse> {
        const params = new URLSearchParams();
        if (filters?.tab) params.append('tab', filters.tab);
        if (filters?.userId) params.append('userId', filters.userId.toString());
        const query = params.toString();
        return this.get<EmdDashboardResponse>(`/dashboard${query ? `?${query}` : ''}`);
    }

    async getDashboardCounts(): Promise<EmdDashboardCounts> {
        return this.get<EmdDashboardCounts>('/dashboard/counts');
    }

    // Existing endpoints
    async create(tenderId: number, data: CreatePaymentRequestDto) {
        return this.post<any[], CreatePaymentRequestDto>(`/tenders/${tenderId}`, data);
    }

    async getByTenderId(tenderId: number) {
        return this.get<any[]>(`/tenders/${tenderId}`);
    }

    async getById(id: number) {
        return this.get<any>(`/${id}`);
    }

    async update(id: number, data: UpdatePaymentRequestDto) {
        return this.patch<any, UpdatePaymentRequestDto>(`/${id}`, data);
    }

    async updateStatus(id: number, data: UpdateStatusDto) {
        return this.patch<any, UpdateStatusDto>(`/${id}/status`, data);
    }
}

export const emdsService = new EmdsService();
export type { EmdDashboardRow, EmdDashboardCounts, EmdDashboardResponse };
