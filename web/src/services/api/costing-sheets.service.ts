import axiosInstance from '@/lib/axios';
import type { TenderCostingSheet, CostingSheetDashboardRow, SubmitCostingSheetDto, UpdateCostingSheetDto, PaginatedResult } from '@/types/api.types';

export type CostingSheetListParams = {
    costingStatus?: 'pending' | 'submitted' | 'rejected';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const costingSheetsService = {
    getAll: async (params?: CostingSheetListParams): Promise<PaginatedResult<CostingSheetDashboardRow>> => {
        const searchParams = new URLSearchParams();

        if (params?.costingStatus) {
            searchParams.set('costingStatus', params.costingStatus);
        }
        if (params?.page) {
            searchParams.set('page', String(params.page));
        }
        if (params?.limit) {
            searchParams.set('limit', String(params.limit));
        }
        if (params?.sortBy) {
            searchParams.set('sortBy', params.sortBy);
        }
        if (params?.sortOrder) {
            searchParams.set('sortOrder', params.sortOrder);
        }

        const queryString = searchParams.toString();
        const url = queryString ? `/costing-sheets?${queryString}` : '/costing-sheets';
        const response = await axiosInstance.get<PaginatedResult<CostingSheetDashboardRow>>(url);
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
