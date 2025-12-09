import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costingApprovalsService, type ApproveCostingDto, type CostingApprovalDashboardRow, type RejectCostingDto } from '@/services/api/costing-approvals.service';
import { toast } from 'sonner';

export const costingApprovalsKey = {
    all: ['costing-approvals'] as const,
    lists: () => [...costingApprovalsKey.all, 'list'] as const,
    detail: (id: number) => [...costingApprovalsKey.all, 'detail', id] as const,
};

export const useCostingApprovals = () => {
    console.log("useCostingApprovals");
    return useQuery({
        queryKey: costingApprovalsKey.lists(),
        queryFn: () => costingApprovalsService.getAll(),
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

export type { CostingApprovalDashboardRow };
