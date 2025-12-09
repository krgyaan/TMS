import axiosInstance from '@/lib/axios';
import type { TenderCostingSheet, CostingSheetDashboardRow, SubmitCostingSheetDto, UpdateCostingSheetDto } from '@/types/api.types';

export const costingSheetsService = {
    getAll: async (): Promise<CostingSheetDashboardRow[]> => {
        const response = await axiosInstance.get<CostingSheetDashboardRow[]>('/costing-sheets');
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<TenderCostingSheet | null> => {
        const response = await axiosInstance.get<TenderCostingSheet>(`/costing-sheets/tender/${tenderId}`);
        return response.data;
    },

    getById: async (id: number): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.get<TenderCostingSheet>(`/costing-sheets/${id}`);
        return response.data;
    },

    submit: async (data: SubmitCostingSheetDto): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.post<TenderCostingSheet>('/costing-sheets', data);
        return response.data;
    },

    update: async (id: number, data: UpdateCostingSheetDto): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.patch<TenderCostingSheet>(`/costing-sheets/${id}`, data);
        return response.data;
    },
};
