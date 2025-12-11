import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
    ResultDashboardResponse,
    ResultDashboardRow,
    ResultDashboardCounts,
    ResultDashboardType,
    PaginatedResult,
} from '@/types/api.types';
import { tenderResultService } from '@/services/api/tender-result.service';

const RESULT_QUERY_KEY = 'tender-results';

export type ResultDashboardFilters = {
    type?: ResultDashboardType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const resultDashboardKey = {
    all: ['result-dashboard'] as const,
    lists: () => [...resultDashboardKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...resultDashboardKey.lists(), { filters }] as const,
}

// Fetch Result dashboard data with counts
export const useResultDashboard = (
    tab?: ResultDashboardType,
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: ResultDashboardFilters = {
        ...(tab && { type: tab }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    const queryKeyFilters = {
        tab,
        ...pagination,
        ...sort,
    };

    return useQuery<PaginatedResult<ResultDashboardRow>>({
        queryKey: resultDashboardKey.list(queryKeyFilters),
        queryFn: () => tenderResultService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    })
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
