import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
    ResultDashboardResponse,
    ResultDashboardRow,
    ResultDashboardCounts,
    ResultDashboardType,
} from '@/types/api.types';

const RESULT_QUERY_KEY = 'tender-results';

// Fetch Result dashboard data with counts
export const useResultDashboard = (type?: ResultDashboardType) => {
    return useQuery<ResultDashboardResponse>({
        queryKey: [RESULT_QUERY_KEY, 'dashboard', type],
        queryFn: async () => {
            const params = type ? `?type=${type}` : '';
            const response = await apiClient.get(`/tender-results/dashboard${params}`);
            return response.data;
        },
    });
};

// Fetch only counts (for badges)
export const useResultDashboardCounts = () => {
    return useQuery<ResultDashboardCounts>({
        queryKey: [RESULT_QUERY_KEY, 'counts'],
        queryFn: async () => {
            const response = await apiClient.get('/tender-results/dashboard/counts');
            return response.data;
        },
    });
};

// Fetch single result by ID
export const useTenderResult = (id: number) => {
    return useQuery<ResultDashboardRow>({
        queryKey: [RESULT_QUERY_KEY, id],
        queryFn: async () => {
            const response = await apiClient.get(`/tender-results/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};

// Upload result mutation (for non-RA tenders)
export const useUploadResult = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const response = await apiClient.patch(`/tender-results/${id}/upload-result`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [RESULT_QUERY_KEY] });
        },
    });
};

// Legacy hook for backward compatibility
export const useTenderResults = () => {
    const query = useResultDashboard();
    return {
        ...query,
        data: query.data?.data,
        counts: query.data?.counts,
    };
};

export type { ResultDashboardRow, ResultDashboardCounts, ResultDashboardResponse };
