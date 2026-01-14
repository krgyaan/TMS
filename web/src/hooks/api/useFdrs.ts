import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fdrsService } from '@/services/api/fdrs.service';
import type {
    FdrDashboardRow,
    FdrDashboardCounts,
    FdrDashboardFilters,
} from '@/modules/bi-dashboard/fdr/helpers/fdr.types';
import type { PaginatedResult } from '@/types/api.types';

export const fdrsKey = {
    all: ['fdrs'] as const,
    lists: () => [...fdrsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...fdrsKey.lists(), { filters }] as const,
    details: () => [...fdrsKey.all, 'detail'] as const,
    detail: (id: number) => [...fdrsKey.details(), id] as const,
    counts: () => [...fdrsKey.all, 'counts'] as const,
};

export const useFdrDashboard = (
    filters?: FdrDashboardFilters
) => {
    const params: FdrDashboardFilters = {
        ...filters,
    };

    const queryKeyFilters = { tab: filters?.tab, page: filters?.page, limit: filters?.limit, search: filters?.search };

    const query = useQuery<PaginatedResult<FdrDashboardRow>>({
        queryKey: fdrsKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await fdrsService.getAll(params);
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

export const useFdrDashboardCounts = () => {
    const query = useQuery<FdrDashboardCounts>({
        queryKey: fdrsKey.counts(),
        queryFn: async () => {
            const result = await fdrsService.getCounts();
            return result;
        },
    });

    return query;
};

export const useUpdateFdrAction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            fdrsService.updateAction(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fdrsKey.all });
            queryClient.invalidateQueries({ queryKey: fdrsKey.counts() });
        },
    });
};

export type { FdrDashboardRow, FdrDashboardCounts };
