import axiosInstance from '@/lib/axios';
import type { RfqDashboardRow, CreateRfqDto, UpdateRfqDto, Rfq } from '@/types/api.types';

export const rfqsService = {
    getAll: async (): Promise<RfqDashboardRow[]> => {
        const response = await axiosInstance.get<RfqDashboardRow[]>('/rfqs');
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
};
