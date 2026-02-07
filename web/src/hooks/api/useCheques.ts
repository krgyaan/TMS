import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chequesService } from '@/services/api/cheques.service';
import type {
    ChequeDashboardRow,
    ChequeDashboardCounts,
    ChequeDashboardFilters,
} from '@/modules/bi-dashboard/cheque/helpers/cheque.types';
import type { PaginatedResult } from '@/types/api.types';

export const chequesKey = {
    all: ['cheques'] as const,
    lists: () => [...chequesKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...chequesKey.lists(), { filters }] as const,
    details: () => [...chequesKey.all, 'detail'] as const,
    detail: (id: number) => [...chequesKey.details(), id] as const,
    counts: () => [...chequesKey.all, 'counts'] as const,
};

export const useChequeDashboard = (
    filters?: ChequeDashboardFilters
) => {
    const params: ChequeDashboardFilters = {
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

    const query = useQuery<PaginatedResult<ChequeDashboardRow>>({
        queryKey: chequesKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await chequesService.getAll(params);
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

export const useChequeDashboardCounts = () => {
    const query = useQuery<ChequeDashboardCounts>({
        queryKey: chequesKey.counts(),
        queryFn: async () => {
            const result = await chequesService.getCounts();
            return result;
        },
    });

    return query;
};

export const useChequeDetails = (id: number) => {
    const query = useQuery({
        queryKey: chequesKey.detail(id),
        queryFn: async () => {
            const result = await chequesService.getById(id);
            return result;
        },
        enabled: !!id,
    });

    return query;
};

export const useUpdateChequeAction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            chequesService.updateAction(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chequesKey.all });
            queryClient.invalidateQueries({ queryKey: chequesKey.counts() });
        },
    });
};

export type { ChequeDashboardRow, ChequeDashboardCounts };
