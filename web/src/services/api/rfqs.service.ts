import axiosInstance from '@/lib/axios';
import type { RfqDashboardRow, CreateRfqDto, UpdateRfqDto, Rfq, PaginatedResult } from '@/types/api.types';

export type RfqFilters = {
    rfqStatus?: 'pending' | 'sent';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const rfqsService = {
    getAll: async (filters?: RfqFilters): Promise<PaginatedResult<RfqDashboardRow>> => {
        const params = new URLSearchParams();
        if (filters?.rfqStatus) params.append('rfqStatus', filters.rfqStatus);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.sortBy) params.append('sortBy', filters.sortBy);
        if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
        const query = params.toString();
        const response = await axiosInstance.get<PaginatedResult<RfqDashboardRow>>(`/rfqs${query ? `?${query}` : ''}`);
        return response.data;
    },

    getById: async (id: number): Promise<Rfq> => {
        const response = await axiosInstance.get<Rfq>(`/rfqs/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<Rfq> => {
        const response = await axiosInstance.get<Rfq>(`/rfqs/by-tender/${tenderId}`);
        return response.data;
    },

    create: async (data: CreateRfqDto): Promise<Rfq> => {
        const response = await axiosInstance.post<Rfq>(`/rfqs`, data);
        return response.data;
    },

    update: async (id: number, data: UpdateRfqDto): Promise<Rfq> => {
        const response = await axiosInstance.patch<Rfq>(`/rfqs/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axiosInstance.delete(`/rfqs/${id}`);
    },

    getDashboardCounts: async (): Promise<any> => {
        const response = await axiosInstance.get<any>('/rfqs/dashboard/counts');
        return response.data;
    },
};
