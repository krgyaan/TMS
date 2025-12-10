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
};

export const useTenders = (
    activeTab?: string,
    statusIds: number[] = [],
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 }
) => {
    const { queryParams: teamParams, teamId, userId, dataScope } = useTeamFilter();

    const filters: TenderListParams = {
        ...(activeTab === 'unallocated' ? { unallocated: true } : {}),
        ...(activeTab !== 'unallocated' && statusIds.length > 0 ? { statusIds } : {}),
        ...teamParams,
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search
    };

    const queryKeyFilters = {
        activeTab,
        statusIds,
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
            toast.success('Tender created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTenderRequest }) =>
            tenderInfosService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            queryClient.invalidateQueries({ queryKey: tendersKey.detail(variables.id) });
            toast.success('Tender updated successfully');
        },
        onError: (error) => {
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
            toast.success('Tender deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
