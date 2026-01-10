import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankGuaranteesService } from '@/services/api/bank-guarantees.service';
import type {
    BankGuaranteeDashboardRow,
    BankGuaranteeDashboardCounts,
    BankGuaranteeDashboardFilters,
} from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import type { PaginatedResult } from '@/types/api.types';

export const bankGuaranteesKey = {
    all: ['bank-guarantees'] as const,
    lists: () => [...bankGuaranteesKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...bankGuaranteesKey.lists(), { filters }] as const,
    details: () => [...bankGuaranteesKey.all, 'detail'] as const,
    detail: (id: number) => [...bankGuaranteesKey.details(), id] as const,
    counts: () => [...bankGuaranteesKey.all, 'counts'] as const,
};

export const useBankGuaranteeDashboard = (
    filters?: BankGuaranteeDashboardFilters
) => {
    const params: BankGuaranteeDashboardFilters = {
        ...filters,
    };

    const queryKeyFilters = { tab: filters?.tab, page: filters?.page, limit: filters?.limit, search: filters?.search };

    const query = useQuery<PaginatedResult<BankGuaranteeDashboardRow>>({
        queryKey: bankGuaranteesKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await bankGuaranteesService.getAll(params);
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

export const useBankGuaranteeDashboardCounts = () => {
    const query = useQuery<BankGuaranteeDashboardCounts>({
        queryKey: bankGuaranteesKey.counts(),
        queryFn: async () => {
            const result = await bankGuaranteesService.getCounts();
            return result;
        },
    });

    return query;
};

export const useUpdateBankGuaranteeAction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            bankGuaranteesService.updateAction(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankGuaranteesKey.all });
            queryClient.invalidateQueries({ queryKey: bankGuaranteesKey.counts() });
        },
    });
};

export type { BankGuaranteeDashboardRow, BankGuaranteeDashboardCounts };
