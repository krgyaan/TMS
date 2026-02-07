import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankTransfersService } from '@/services/api/bank-transfers.service';
import type {
    BankTransferDashboardRow,
    BankTransferDashboardCounts,
    BankTransferDashboardFilters,
} from '@/modules/bi-dashboard/bank-tranfer/helpers/bankTransfer.types';
import type { PaginatedResult } from '@/types/api.types';

export const bankTransfersKey = {
    all: ['bank-transfers'] as const,
    lists: () => [...bankTransfersKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...bankTransfersKey.lists(), { filters }] as const,
    details: () => [...bankTransfersKey.all, 'detail'] as const,
    detail: (id: number) => [...bankTransfersKey.details(), id] as const,
    counts: () => [...bankTransfersKey.all, 'counts'] as const,
};

export const useBankTransferDashboard = (
    filters?: BankTransferDashboardFilters
) => {
    const params: BankTransferDashboardFilters = {
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

    const query = useQuery<PaginatedResult<BankTransferDashboardRow>>({
        queryKey: bankTransfersKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await bankTransfersService.getAll(params);
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

export const useBankTransferDashboardCounts = () => {
    const query = useQuery<BankTransferDashboardCounts>({
        queryKey: bankTransfersKey.counts(),
        queryFn: async () => {
            const result = await bankTransfersService.getCounts();
            return result;
        },
    });

    return query;
};

export const useBankTransferDetails = (id: number) => {
    const query = useQuery({
        queryKey: bankTransfersKey.detail(id),
        queryFn: async () => {
            const result = await bankTransfersService.getById(id);
            return result;
        },
        enabled: !!id,
    });

    return query;
};

export const useUpdateBankTransferAction = () => {
    const queryClient = useQueryClient();
    console.log('Action Form called');

    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            bankTransfersService.updateAction(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankTransfersKey.all });
            queryClient.invalidateQueries({ queryKey: bankTransfersKey.counts() });
            console.log('useUpdateBankTransferAction onSuccess called');
        },
        onError: (error: any) => {
            console.log('useUpdateBankTransferAction onError called', error);
        },
    });
};

export type { BankTransferDashboardRow, BankTransferDashboardCounts };
