import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costingApprovalsService } from '@/services/api/costing-approvals.service';
import type { CostingApprovalListParams, CostingApprovalDashboardRow, CostingApprovalDashboardCounts, CostingApprovalTab, ApproveCostingDto, RejectCostingDto, ApproveAllCostingDto, UpdateApprovedCostingDto } from '@/modules/tendering/costing-approvals/helpers/costingApproval.types';
import { toast } from 'sonner';
import type { PaginatedResult } from '@/types/api.types';
import { useTeamFilter } from '@/hooks/useTeamFilter';

export const costingApprovalsKey = {
    all: ['costing-approvals'] as const,
    lists: () => [...costingApprovalsKey.all, 'list'] as const,
    detail: (id: number) => [...costingApprovalsKey.all, 'detail', id] as const,
    list: (filters?: Record<string, unknown>) => [...costingApprovalsKey.lists(), { filters }] as const,
    dashboardCounts: () => [...costingApprovalsKey.all, 'dashboard-counts'] as const,
};

export const useCostingApprovals = (
    tab?: CostingApprovalTab,
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const { teamId, userId, dataScope } = useTeamFilter();
    const teamIdParam = teamId !== null ? teamId : undefined;

    const params: CostingApprovalListParams = {
        ...(tab && { tab }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    const queryKeyFilters = {
        tab,
        ...pagination,
        ...sort,
        dataScope,
        teamId: teamId ?? null,
        userId: userId ?? null,
    };

    return useQuery<PaginatedResult<CostingApprovalDashboardRow>>({
        queryKey: costingApprovalsKey.list(queryKeyFilters),
        queryFn: () => costingApprovalsService.getAll(params, teamIdParam),
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
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.dashboardCounts() });
            toast.success('Costing detail approved');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to approve costing');
        },
    });
};

export const useApproveAllCosting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: ApproveAllCostingDto }) =>
            costingApprovalsService.approveAll(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.all });
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.dashboardCounts() });
            toast.success('All costing details approved');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to approve all costing');
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
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.dashboardCounts() });
            toast.success('Costing detail rejected');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to reject costing');
        },
    });
};

export const useUpdateApprovedCosting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateApprovedCostingDto }) =>
            costingApprovalsService.updateApproved(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.all });
            queryClient.invalidateQueries({ queryKey: costingApprovalsKey.dashboardCounts() });
            toast.success('Approved costing updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update costing');
        },
    });
};

export const useCostingApprovalsDashboardCounts = () => {
    const { teamId, userId, dataScope } = useTeamFilter();
    const teamIdParam = teamId !== null ? teamId : undefined;

    const queryKey = [...costingApprovalsKey.dashboardCounts(), dataScope, teamId ?? null, userId ?? null];

    return useQuery<CostingApprovalDashboardCounts>({
        queryKey,
        queryFn: () => costingApprovalsService.getDashboardCounts(teamIdParam),
        staleTime: 0,
    });
};

export type { CostingApprovalDashboardRow };
