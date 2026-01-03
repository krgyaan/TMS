import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costingSheetsService } from '@/services/api/costing-sheets.service';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import type { CostingSheetDashboardCounts, CostingSheetDashboardRow, TabKey, CostingSheetListParams } from '@/modules/tendering/costing-sheets/helpers/costingSheet.types';

export const costingSheetsKey = {
    all: ['costing-sheets'] as const,
    lists: () => [...costingSheetsKey.all, 'list'] as const,
    detail: (id: number) => [...costingSheetsKey.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...costingSheetsKey.all, 'byTender', tenderId] as const,
    list: (params?: CostingSheetListParams) => [...costingSheetsKey.lists(), { params }] as const,
    dashboardCounts: () => [...costingSheetsKey.all, 'dashboardCounts'] as const,
};

export const useCostingSheets = (
    tab?: TabKey,
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: CostingSheetListParams = {
        ...(tab && { tab }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    return useQuery<PaginatedResult<CostingSheetDashboardRow>>({
        queryKey: costingSheetsKey.list(params),
        queryFn: () => costingSheetsService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
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
            queryClient.invalidateQueries({ queryKey: costingSheetsKey.dashboardCounts() });
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
            queryClient.invalidateQueries({ queryKey: costingSheetsKey.dashboardCounts() });
            toast.success('Costing sheet updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update costing sheet');
        },
    });
};

export const useCostingSheetsCounts = () => {
    return useQuery<CostingSheetDashboardCounts>({
        queryKey: costingSheetsKey.dashboardCounts(),
        queryFn: () => costingSheetsService.getDashboardCounts(),
        staleTime: 30000, // Cache for 30 seconds
    });
};

export const useCheckDriveScopes = () => {
    return useQuery({
        queryKey: [...costingSheetsKey.all, 'driveScopes'],
        queryFn: () => costingSheetsService.checkDriveScopes(),
        staleTime: 60000, // Cache for 1 minute
    });
};

export const useCreateCostingSheet = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tenderId: number) => costingSheetsService.createSheet(tenderId),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: costingSheetsKey.all });
                queryClient.invalidateQueries({ queryKey: costingSheetsKey.dashboardCounts() });
                toast.success('Costing sheet created successfully');
            }
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to create costing sheet';
            toast.error(message);
        },
    });
};

export const useCreateCostingSheetWithName = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, customName }: { tenderId: number; customName: string }) =>
            costingSheetsService.createSheetWithName(tenderId, customName),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: costingSheetsKey.all });
                queryClient.invalidateQueries({ queryKey: costingSheetsKey.dashboardCounts() });
                toast.success('Costing sheet created successfully');
            }
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to create costing sheet';
            toast.error(message);
        },
    });
};
