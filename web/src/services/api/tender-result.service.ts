import axiosInstance from '@/lib/axios';
import type { ResultDashboardRow, TenderResult, UploadResultDto } from '@/types/api.types';

export const tenderResultService = {
    getAll: async (): Promise<ResultDashboardRow[]> => {
        const response = await axiosInstance.get<ResultDashboardRow[]>('/tender-results');
        return response.data;
    },

    getById: async (id: number): Promise<TenderResult> => {
        const response = await axiosInstance.get<TenderResult>(`/tender-results/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<TenderResult | null> => {
        const response = await axiosInstance.get<TenderResult>(`/tender-results/tender/${tenderId}`);
        return response.data;
    },

    getRaDetails: async (id: number): Promise<any | null> => {
        const response = await axiosInstance.get(`/tender-results/${id}/ra-details`);
        return response.data;
    },

    uploadResult: async (id: number, data: UploadResultDto): Promise<TenderResult> => {
        const response = await axiosInstance.patch<TenderResult>(
            `/tender-results/${id}/upload-result`,
            data
        );
        return response.data;
    },
};
