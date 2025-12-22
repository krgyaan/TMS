import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
    console.log('=== useResultDashboard Hook ===');
    console.log('tab:', tab);
    console.log('pagination:', pagination);
    console.log('sort:', sort);

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

    console.log('params:', params);
    console.log('queryKeyFilters:', queryKeyFilters);

    const query = useQuery<PaginatedResult<ResultDashboardRow>>({
        queryKey: tenderResultKey.list(queryKeyFilters),
        queryFn: async () => {
            console.log('=== useResultDashboard queryFn executing ===');
            console.log('Calling tenderResultService.getAll with params:', params);
            const result = await tenderResultService.getAll(params);
            console.log('=== useResultDashboard queryFn result ===');
            console.log('result:', result);
            console.log('result.data:', result?.data);
            console.log('result.meta:', result?.meta);
            console.log('result.data length:', result?.data?.length);
            return result;
        },
        // Prevents table flashing while fetching next page
        placeholderData: (previousData) => {
            console.log('=== useResultDashboard placeholderData ===');
            console.log('previousData:', previousData);
            // Only keep previous data if it's the correct structure (PaginatedResult)
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                console.log('Keeping previous data');
                return previousData;
            }
            console.log('Not keeping previous data');
            return undefined;
        },
    });

    useEffect(() => {
        console.log('=== useResultDashboard Query State ===');
        console.log('query.data:', query.data);
        console.log('query.isLoading:', query.isLoading);
        console.log('query.isError:', query.isError);
        console.log('query.error:', query.error);
        console.log('query.status:', query.status);
    }, [query.data, query.isLoading, query.isError, query.error, query.status]);

    return query;
};

// Fetch only counts (for badges)
export const useResultDashboardCounts = () => {
    console.log('=== useResultDashboardCounts Hook ===');

    const query = useQuery<ResultDashboardCounts>({
        queryKey: tenderResultKey.counts(),
        queryFn: async () => {
            console.log('=== useResultDashboardCounts queryFn executing ===');
            console.log('Calling tenderResultService.getCounts()');
            const result = await tenderResultService.getCounts();
            console.log('=== useResultDashboardCounts queryFn result ===');
            console.log('result:', result);
            console.log('result.pending:', result?.pending);
            console.log('result.won:', result?.won);
            console.log('result.lost:', result?.lost);
            console.log('result.disqualified:', result?.disqualified);
            console.log('result.total:', result?.total);
            return result;
        },
    });

    useEffect(() => {
        console.log('=== useResultDashboardCounts Query State ===');
        console.log('query.data:', query.data);
        console.log('query.isLoading:', query.isLoading);
        console.log('query.isError:', query.isError);
        console.log('query.error:', query.error);
        console.log('query.status:', query.status);
    }, [query.data, query.isLoading, query.isError, query.error, query.status]);

    return query;
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
