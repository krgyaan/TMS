import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenderResultService } from '@/services/api/tender-result.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import { useTeamFilter } from '@/hooks/useTeamFilter';
import type {
    ResultDashboardResponse,
    ResultDashboardRow,
    ResultDashboardCounts,
    TenderResult,
    UploadResultFormPageProps,
    ResultDashboardFilters,
} from '@/modules/tendering/results/helpers/tenderResult.types';
import type { PaginatedResult } from '@/types/api.types';

export const tenderResultKey = {
    all: ['tender-results'] as const,
    lists: () => [...tenderResultKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...tenderResultKey.lists(), { filters }] as const,
    details: () => [...tenderResultKey.all, 'detail'] as const,
    detail: (id: number) => [...tenderResultKey.details(), id] as const,
    byTender: (tenderId: number) => [...tenderResultKey.all, 'by-tender', tenderId] as const,
    counts: () => [...tenderResultKey.all, 'counts'] as const,
};

export const useResultDashboard = (
    filters?: ResultDashboardFilters
) => {
    const params: ResultDashboardFilters = {
        ...filters,
    };

    const queryKeyFilters = { 
        tab: filters?.tab, 
        page: filters?.page, 
        limit: filters?.limit, 
        search: filters?.search,
        sortBy: filters?.sortBy,
        sortOrder: filters?.sortOrder
    };

    const query = useQuery<PaginatedResult<ResultDashboardRow>>({
        queryKey: tenderResultKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await tenderResultService.getAll(params);
            return result;
        },
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });

    return query;
};

export const useResultDashboardCounts = () => {
    const { teamId, userId, dataScope } = useTeamFilter();
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;
    const queryKey = [...tenderResultKey.counts(), dataScope, teamId ?? null, userId ?? null];
    
    return useQuery<ResultDashboardCounts>({
        queryKey,
        queryFn: async () => {
            const result = await tenderResultService.getCounts(teamIdParam);
            return result;
        },
        staleTime: 0,
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
        queryFn: async () => {
            try {
                return await tenderResultService.getByTenderId(tenderId!);
            } catch (error: any) {
                // Handle 404 gracefully - return null if resource doesn't exist
                if (error?.response?.status === 404) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!tenderId,
    });
};

// Upload result mutation (for non-RA tenders)
export const useUploadResult = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: UploadResultFormPageProps }) =>
            tenderResultService.uploadResult(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenderResultKey.lists() });
            queryClient.invalidateQueries({ queryKey: tenderResultKey.byTender(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: tenderResultKey.counts() });
            toast.success("Result uploaded successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export type { ResultDashboardRow, ResultDashboardCounts, ResultDashboardResponse };
