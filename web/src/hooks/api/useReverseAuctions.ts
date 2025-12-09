import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
    RaDashboardResponse,
    RaDashboardRow,
    RaDashboardCounts,
    RaDashboardType,
} from '@/types/api.types';

const RA_QUERY_KEY = 'reverse-auctions';

// Fetch RA dashboard data with counts
export const useRaDashboard = (type?: RaDashboardType) => {
    return useQuery<RaDashboardResponse>({
        queryKey: [RA_QUERY_KEY, 'dashboard', type],
        queryFn: async () => {
            const params = type ? `?type=${type}` : '';
            const response = await apiClient.get(`/reverse-auctions/dashboard${params}`);
            return response.data;
        },
    });
};

// Fetch only counts (for badges)
export const useRaDashboardCounts = () => {
    return useQuery<RaDashboardCounts>({
        queryKey: [RA_QUERY_KEY, 'counts'],
        queryFn: async () => {
            const response = await apiClient.get('/reverse-auctions/dashboard/counts');
            return response.data;
        },
    });
};

// Fetch single RA by ID
export const useReverseAuction = (id: number) => {
    return useQuery<RaDashboardRow>({
        queryKey: [RA_QUERY_KEY, id],
        queryFn: async () => {
            const response = await apiClient.get(`/reverse-auctions/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

// Schedule RA mutation
export const useScheduleRa = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const response = await apiClient.patch(`/reverse-auctions/${id}/schedule`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [RA_QUERY_KEY] });
        },
    });
};

// Upload RA result mutation
export const useUploadRaResult = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const response = await apiClient.patch(`/reverse-auctions/${id}/upload-result`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [RA_QUERY_KEY] });
        },
    });
};

// Legacy hook for backward compatibility
export const useReverseAuctions = () => {
    const query = useRaDashboard();
    return {
        ...query,
        data: query.data?.data,
        counts: query.data?.counts,
    };
};

export type { RaDashboardRow, RaDashboardCounts, RaDashboardResponse };
