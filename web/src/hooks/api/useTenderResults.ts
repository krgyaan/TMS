import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenderResultService } from '@/services/api/tender-result.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import type {
    ResultDashboardResponse,
    ResultDashboardRow,
    ResultDashboardCounts,
    ResultDashboardType,
    PaginatedResult,
    UploadResultDto,
    TenderResult,
} from '@/types/api.types';

export const tenderResultKey = {
    all: ['tender-results'] as const,
    lists: () => [...tenderResultKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...tenderResultKey.lists(), { filters }] as const,
    details: () => [...tenderResultKey.all, 'detail'] as const,
    detail: (id: number) => [...tenderResultKey.details(), id] as const,
    byTender: (tenderId: number) => [...tenderResultKey.all, 'by-tender', tenderId] as const,
    counts: () => [...tenderResultKey.all, 'counts'] as const,
};

export type ResultDashboardFilters = {
    type?: ResultDashboardType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

// Fetch Result dashboard data with counts
export const useResultDashboard = (
    tab?: ResultDashboardType,
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    console.log('useResultDashboard');
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
        queryKey: tenderResultKey.list(queryKeyFilters),
        queryFn: () => tenderResultService.getAll(params),
        // Prevents table flashing while fetching next page
        placeholderData: (previousData) => {
            // Only keep previous data if it's the correct structure (PaginatedResult)
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

// Fetch only counts (for badges)
export const useResultDashboardCounts = () => {
    console.log('useResultDashboardCounts');
    return useQuery<ResultDashboardCounts>({
        queryKey: tenderResultKey.counts(),
        queryFn: () => tenderResultService.getCounts(),
    });
};

// Fetch single result by ID
export const useTenderResult = (id: number | null) => {
    return useQuery<TenderResult>({
        queryKey: id ? tenderResultKey.detail(id) : tenderResultKey.detail(0),
        queryFn: () => tenderResultService.getById(id!),
        enabled: !!id,
    });
};

// Fetch result by tender ID
export const useTenderResultByTenderId = (tenderId: number | null) => {
    return useQuery<TenderResult | null>({
        queryKey: tenderId ? tenderResultKey.byTender(tenderId) : tenderResultKey.byTender(0),
        queryFn: () => tenderResultService.getByTenderId(tenderId!),
        enabled: !!tenderId,
    });
};

// Upload result mutation (for non-RA tenders)
export const useUploadResult = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UploadResultDto }) =>
            tenderResultService.uploadResult(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenderResultKey.lists() });
            queryClient.invalidateQueries({ queryKey: tenderResultKey.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: tenderResultKey.counts() });
            toast.success("Result uploaded successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Legacy hook for backward compatibility
export const useTenderResults = () => {
    const query = useResultDashboard();
    const countsQuery = useResultDashboardCounts();
    return {
        ...query,
        data: query.data?.data,
        counts: countsQuery.data,
    };
};

export type { ResultDashboardRow, ResultDashboardCounts, ResultDashboardResponse };
