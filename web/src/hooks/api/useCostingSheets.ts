import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costingSheetsService } from '@/services/api/costing-sheets.service';
import type { CostingSheetDashboardRow } from '@/types/api.types';
import { toast } from 'sonner';

export const costingSheetsKey = {
    all: ['costing-sheets'] as const,
    lists: () => [...costingSheetsKey.all, 'list'] as const,
    detail: (id: number) => [...costingSheetsKey.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...costingSheetsKey.all, 'byTender', tenderId] as const,
};

export const useCostingSheets = () => {
    return useQuery({
        queryKey: costingSheetsKey.lists(),
        queryFn: () => costingSheetsService.getAll(),
    });
};

export const useCostingSheetByTender = (tenderId: number) => {
    return useQuery({
        queryKey: costingSheetsKey.byTender(tenderId),
        queryFn: () => costingSheetsService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

export const useCostingSheetById = (id: number) => {
    return useQuery({
        queryKey: costingSheetsKey.detail(id),
        queryFn: () => costingSheetsService.getById(id),
        enabled: !!id,
    });
};

export const useSubmitCostingSheet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: costingSheetsService.submit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingSheetsKey.all });
            toast.success('Costing sheet submitted successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit costing sheet');
        },
    });
};

export const useUpdateCostingSheet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            costingSheetsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingSheetsKey.all });
            toast.success('Costing sheet updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update costing sheet');
        },
    });
};

export type { CostingSheetDashboardRow };
