import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { demandDraftsService } from '@/services/api/demand-drafts.service';
import type {
    DemandDraftDashboardRow,
    DemandDraftDashboardCounts,
    DemandDraftDashboardFilters,
} from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';
import type { PaginatedResult } from '@/types/api.types';

export const demandDraftsKey = {
    all: ['demand-drafts'] as const,
    lists: () => [...demandDraftsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...demandDraftsKey.lists(), { filters }] as const,
    details: () => [...demandDraftsKey.all, 'detail'] as const,
    detail: (id: number) => [...demandDraftsKey.details(), id] as const,
    counts: () => [...demandDraftsKey.all, 'counts'] as const,
};

export const useDemandDraftDashboard = (
    filters?: DemandDraftDashboardFilters
) => {
    const params: DemandDraftDashboardFilters = {
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

    const query = useQuery<PaginatedResult<DemandDraftDashboardRow>>({
        queryKey: demandDraftsKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await demandDraftsService.getAll(params);
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

export const useDemandDraftDashboardCounts = () => {
    const query = useQuery<DemandDraftDashboardCounts>({
        queryKey: demandDraftsKey.counts(),
        queryFn: async () => {
            const result = await demandDraftsService.getCounts();
            return result;
        },
    });

    return query;
};

export const useDemandDraftDetails = (id: number) => {
    const query = useQuery({
        queryKey: demandDraftsKey.detail(id),
        queryFn: async () => {
            const result = await demandDraftsService.getById(id);
            return result;
        },
        enabled: !!id,
    });

    return query;
};

export const useUpdateDemandDraftAction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            demandDraftsService.updateAction(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: demandDraftsKey.all });
            queryClient.invalidateQueries({ queryKey: demandDraftsKey.counts() });
        },
    });
};

export type { DemandDraftDashboardRow, DemandDraftDashboardCounts };
