import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fixedExpenseService } from '@/services/api/fixed-expense.service';
import type {
    CreateFixedExpenseDto,
    FixedExpenseListParams,
    FixedExpenseListRow,
    FixedExpenseResponse,
    UpdateFixedExpenseDto,
} from '@/modules/accounts/fixed-expenses/helpers/fixedExpense.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

// ===================== QUERY KEYS =====================

export const fixedExpenseKeys = {
    all: ['fixed-expenses'] as const,
    lists: () => [...fixedExpenseKeys.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...fixedExpenseKeys.lists(), { filters }] as const,
    detail: (id: number) => [...fixedExpenseKeys.all, 'detail', id] as const,
};

// ===================== FIXED EXPENSE HOOKS =====================

/**
 * Hook to fetch paginated fixed expenses list
 */
export const useFixedExpenses = (params: FixedExpenseListParams = { page: 1, limit: 10 }) => {
    return useQuery<PaginatedResult<FixedExpenseListRow>>({
        queryKey: fixedExpenseKeys.list({ ...params }),
        queryFn: () => fixedExpenseService.getAll(params),
        placeholderData: (previousData) => previousData,
    });
};

/**
 * Hook to fetch a single fixed expense by ID
 */
export const useFixedExpense = (id: number | null) => {
    return useQuery<FixedExpenseResponse>({
        queryKey: fixedExpenseKeys.detail(id ?? 0),
        queryFn: () => fixedExpenseService.getById(id!),
        enabled: !!id,
    });
};

/**
 * Hook to create a new fixed expense
 */
export const useCreateFixedExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFixedExpenseDto) => fixedExpenseService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fixedExpenseKeys.lists() });
            toast.success('Fixed expense created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

/**
 * Hook to update a fixed expense
 */
export const useUpdateFixedExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateFixedExpenseDto }) =>
            fixedExpenseService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: fixedExpenseKeys.lists() });
            queryClient.invalidateQueries({ queryKey: fixedExpenseKeys.detail(data.id) });
            toast.success('Fixed expense updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

/**
 * Hook to archive / restore a fixed expense (soft delete)
 */
export const useArchiveFixedExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, deleteStatus }: { id: number; deleteStatus: boolean }) =>
            fixedExpenseService.archive(id, deleteStatus),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: fixedExpenseKeys.lists() });
            queryClient.invalidateQueries({ queryKey: fixedExpenseKeys.detail(data.id) });
            toast.success(data.deleteStatus ? 'Fixed expense archived' : 'Fixed expense restored');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
