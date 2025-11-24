import axiosInstance from '@/lib/axios';
import type { TenderApproval, SaveTenderApprovalDto, TenderApprovalTabData } from '@/types/api.types';

export const tenderApprovalsService = {
    getAll: async (): Promise<TenderApprovalTabData[]> => {
        const response = await axiosInstance.get<TenderApprovalTabData[]>('/tender-approvals');
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<TenderApproval | null> => {
        const response = await axiosInstance.get<TenderApproval>(`/tender-approvals/${tenderId}/approval`);
        return response.data;
    },

    create: async (tenderId: number, data: SaveTenderApprovalDto): Promise<TenderApproval> => {
        const response = await axiosInstance.put<TenderApproval>(`/tender-approvals/${tenderId}/approval`, data);
        return response.data;
    },

    update: async (tenderId: number, data: SaveTenderApprovalDto): Promise<TenderApproval> => {
        const response = await axiosInstance.put<TenderApproval>(`/tender-approvals/${tenderId}/approval`, data);
        return response.data;
    },
};
