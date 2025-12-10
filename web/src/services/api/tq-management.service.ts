import axiosInstance from '@/lib/axios';
import type { TenderQuery, TqManagementDashboardRow, CreateTqReceivedDto, UpdateTqRepliedDto, UpdateTqMissedDto } from '@/types/api.types';


export const tqManagementService = {
    getAll: async (): Promise<TqManagementDashboardRow[]> => {
        const response = await axiosInstance.get<TqManagementDashboardRow[]>('/tq-management');
        return response.data;
    },

    getById: async (id: number): Promise<TenderQuery> => {
        const response = await axiosInstance.get<TenderQuery>(`/tq-management/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<TenderQuery[]> => {
        const response = await axiosInstance.get<TenderQuery[]>(`/tq-management/tender/${tenderId}`);
        return response.data;
    },

    getTqItems: async (id: number): Promise<any[]> => {
        const response = await axiosInstance.get(`/tq-management/${id}/items`);
        return response.data;
    },

    createTqReceived: async (data: CreateTqReceivedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.post<TenderQuery>('/tq-management/received', data);
        return response.data;
    },

    updateTqReplied: async (id: number, data: UpdateTqRepliedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.patch<TenderQuery>(`/tq-management/${id}/replied`, data);
        return response.data;
    },

    updateTqMissed: async (id: number, data: UpdateTqMissedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.patch<TenderQuery>(`/tq-management/${id}/missed`, data);
        return response.data;
    },

    markAsNoTq: async (tenderId: number): Promise<TenderQuery> => {
        const response = await axiosInstance.post<TenderQuery>('/tq-management/no-tq', { tenderId });
        return response.data;
    },

    updateTqReceived: async (id: number, data: CreateTqReceivedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.patch<TenderQuery>(`/tq-management/${id}/received`, data);
        return response.data;
    },
};
