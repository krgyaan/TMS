import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costingApprovalsService, type ApproveCostingDto, type CostingApprovalDashboardRow, type RejectCostingDto, type CostingApprovalListParams } from '@/services/api/costing-approvals.service';
import { toast } from 'sonner';
import type { PaginatedResult, CostingApprovalDashboardCounts } from '@/types/api.types';

export const costingApprovalsKey = {
    all: ['costing-approvals'] as const,
    lists: () => [...costingApprovalsKey.all, 'list'] as const,
    detail: (id: number) => [...costingApprovalsKey.all, 'detail', id] as const,
    list: (filters?: Record<string, unknown>) => [...costingApprovalsKey.lists(), { filters }] as const,
    dashboardCounts: () => [...costingApprovalsKey.all, 'dashboard-counts'] as const,
};

export const useCostingApprovals = (
    tab?: 'pending' | 'approved' | 'rejected',
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const costingStatusMap: Record<string, 'Pending' | 'Approved' | 'Rejected/Redo'> = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected/Redo',
    };

    const params: CostingApprovalListParams = {
        ...(tab && costingStatusMap[tab] && { costingStatus: costingStatusMap[tab] }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    const queryKeyFilters = {
        tab,
        ...pagination,
        ...sort,
    };

    return useQuery<PaginatedResult<CostingApprovalDashboardRow>>({
        queryKey: costingApprovalsKey.list(queryKeyFilters),
        queryFn: () => costingApprovalsService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useCostingApprovalById = (id: number) => {
    return useQuery({
        queryKey: costingApprovalsKey.detail(id),
        queryFn: () => costingApprovalsService.getById(id),
        enabled: !!id,
    });
};

export const useApproveCosting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: ApproveCostingDto }) =>
            costingApprovalsService.approve(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.all });
            toast.success('Costing sheet approved successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to approve costing sheet');
        },
    });
};

export const useRejectCosting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: RejectCostingDto }) =>
            costingApprovalsService.reject(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.all });
            toast.success('Costing sheet rejected');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to reject costing sheet');
        },
    });
};

export const useUpdateApprovedCosting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            costingApprovalsService.updateApproved(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.all });
            toast.success('Approved costing updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update costing');
        },
    });
};

export const useCostingApprovalsDashboardCounts = () => {
    return useQuery<CostingApprovalDashboardCounts>({
        queryKey: costingApprovalsKey.dashboardCounts(),
        queryFn: () => costingApprovalsService.getDashboardCounts(),
        staleTime: 30000, // Cache for 30 seconds
    });
};

export type { CostingApprovalDashboardRow };
