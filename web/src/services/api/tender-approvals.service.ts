import axiosInstance from '@/lib/axios';
import type { TenderApproval, SaveTenderApprovalDto, TenderApprovalRow, PaginatedResult } from '@/types/api.types';

export type TenderApprovalFilters = {
    tlStatus?: '0' | '1' | '2' | '3';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const tenderApprovalsService = {
    getAll: async (filters?: TenderApprovalFilters): Promise<Record<string, TenderApprovalRow[]> | PaginatedResult<TenderApprovalRow>> => {
        const params = new URLSearchParams();
        if (filters?.tlStatus) params.append('tlStatus', filters.tlStatus);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.sortBy) params.append('sortBy', filters.sortBy);
        if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
        const query = params.toString();
        const response = await axiosInstance.get<Record<string, TenderApprovalRow[]> | PaginatedResult<TenderApprovalRow>>(`/tender-approvals${query ? `?${query}` : ''}`);
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
