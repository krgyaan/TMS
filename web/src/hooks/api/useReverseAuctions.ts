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
export const useRaDashboard = (
    type?: RaDashboardType,
    pagination?: { page: number; limit: number },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const queryKeyFilters = {
        type,
        ...pagination,
        ...sort,
    };

    return useQuery<RaDashboardResponse>({
        queryKey: [RA_QUERY_KEY, 'dashboard', queryKeyFilters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (type) params.append('type', type);
            if (pagination?.page) params.append('page', String(pagination.page));
            if (pagination?.limit) params.append('limit', String(pagination.limit));
            if (sort?.sortBy) params.append('sortBy', sort.sortBy);
            if (sort?.sortOrder) params.append('sortOrder', sort.sortOrder);

            const queryString = params.toString();
            const url = `/reverse-auctions/dashboard${queryString ? `?${queryString}` : ''}`;
            const response = await apiClient.get(url);
            return response.data;
        },
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'counts' in previousData) {
                return previousData;
            }
            return undefined;
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
