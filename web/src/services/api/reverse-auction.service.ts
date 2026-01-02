import axiosInstance from '@/lib/axios';
import type { RaDashboardRow, ReverseAuction, ScheduleRaDto, UploadRaResultDto } from '@/types/api.types';

export type RaDashboardFilters = {
    tabKey?: 'under-evaluation' | 'scheduled' | 'completed';
    type?: 'under-evaluation' | 'scheduled' | 'completed'; // Legacy support
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const reverseAuctionService = {
    getDashboard: async (filters?: RaDashboardFilters): Promise<any> => {
        const search = new URLSearchParams();
        if (filters) {
            // Use tabKey if provided, otherwise fall back to type for backward compatibility
            if (filters.tabKey) {
                search.set('tabKey', filters.tabKey);
            } else if (filters.type) {
                search.set('type', filters.type);
            }
            if (filters.page) search.set('page', filters.page.toString());
            if (filters.limit) search.set('limit', filters.limit.toString());
            if (filters.sortBy) search.set('sortBy', filters.sortBy);
            if (filters.sortOrder) search.set('sortOrder', filters.sortOrder);
        }
        const queryString = search.toString();
        const response = await axiosInstance.get(`/reverse-auctions/dashboard${queryString ? `?${queryString}` : ''}`);
        return response.data;
    },

    getAll: async (): Promise<RaDashboardRow[]> => {
        const response = await axiosInstance.get<RaDashboardRow[]>('/reverse-auctions');
        return response.data;
    },

    getById: async (id: number): Promise<ReverseAuction> => {
        const response = await axiosInstance.get<ReverseAuction>(`/reverse-auctions/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<ReverseAuction | null> => {
        const response = await axiosInstance.get<ReverseAuction>(`/reverse-auctions/tender/${tenderId}`);
        return response.data;
    },

    scheduleRa: async (id: number, data: ScheduleRaDto): Promise<ReverseAuction> => {
        const response = await axiosInstance.patch<ReverseAuction>(
            `/reverse-auctions/${id}/schedule`,
            data
        );
        return response.data;
    },

    uploadResult: async (id: number, data: UploadRaResultDto): Promise<ReverseAuction> => {
        const response = await axiosInstance.patch<ReverseAuction>(
            `/reverse-auctions/${id}/upload-result`,
            data
        );
        return response.data;
    },
};
