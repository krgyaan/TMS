import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenderInfosService } from '@/services/api';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import { useTeamFilter } from '@/hooks/useTeamFilter';
import type { CreateTenderRequest, TenderListParams, UpdateTenderRequest, PaginatedResult, TenderInfoWithNames } from '@/types/api.types';

export const tendersKey = {
    all: ['tenders'] as const,
    lists: () => [...tendersKey.all, 'list'] as const,
    // list: (filters?: Record<string, unknown>) => [...tendersKey.lists(), { filters }] as const,
    details: () => [...tendersKey.all, 'detail'] as const,
    detail: (id: number) => [...tendersKey.details(), id] as const,
    list: (filters?: Record<string, unknown>) => [...tendersKey.lists(), { filters }] as const,
    dashboardCounts: () => [...tendersKey.all, 'dashboard-counts'] as const,
};

export const useTenders = (
    activeTab?: string,
    category?: string,
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 }
) => {
    const { queryParams: teamParams, teamId, userId, dataScope } = useTeamFilter();

    const filters: TenderListParams = {
        ...(activeTab === 'unallocated' ? { unallocated: true } : {}),
        ...(activeTab !== 'unallocated' && category ? { category } : {}),
        ...teamParams,
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search
    };

    const queryKeyFilters = {
        activeTab,
        category,
        teamId,
        userId,
        dataScope,
        ...pagination,
    };

    return useQuery<PaginatedResult<TenderInfoWithNames>>({
        queryKey: tendersKey.list(queryKeyFilters),
        queryFn: () => tenderInfosService.getAll(filters),
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

export const useTender = (id: number | null) => {
    return useQuery({
        queryKey: id ? tendersKey.detail(id) : tendersKey.detail(0),
        queryFn: () => tenderInfosService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTenderRequest) => tenderInfosService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            toast.success("Tender created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTenderRequest }) => tenderInfosService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            queryClient.invalidateQueries({ queryKey: tendersKey.detail(variables.id) });
            toast.success("Tender updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => tenderInfosService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            toast.success("Tender deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useGenerateTenderName = () => {
    return useMutation({
        mutationFn: (params: { organization: number; item: number; location?: number }) =>
            tenderInfosService.generateName(params),
        onError: error => {
            console.error("Error generating tender name:", error);
        },
    });
};

export const useTendersDashboardCounts = () => {
    const { teamId, userId, dataScope } = useTeamFilter();
    // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;

    // Include all filter context in query key to ensure proper cache invalidation
    // Use explicit values (including null) so React Query can properly differentiate cache entries
    const queryKey = [...tendersKey.dashboardCounts(), dataScope, teamId ?? null, userId ?? null];

    return useQuery({
        queryKey,
        queryFn: () => tenderInfosService.getDashboardCounts(teamIdParam),
        staleTime: 0, // Always refetch when query key changes to ensure counts are up-to-date
    });
};

export const useUpdateTenderStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { status: number; comment: string } }) =>
            tenderInfosService.updateStatus(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            queryClient.invalidateQueries({ queryKey: tendersKey.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: tendersKey.dashboardCounts() });
            toast.success("Tender status updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
