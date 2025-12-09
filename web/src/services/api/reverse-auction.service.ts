import axiosInstance from '@/lib/axios';
import type { RaDashboardRow, ReverseAuction, ScheduleRaDto, UploadRaResultDto } from '@/types/api.types';

export const reverseAuctionService = {
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
