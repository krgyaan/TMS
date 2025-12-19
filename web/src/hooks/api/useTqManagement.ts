import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tqManagementService } from '@/services/api/tq-management.service';
import { toast } from 'sonner';
import type { TenderQueryStatus, TqManagementDashboardCounts } from '@/types/api.types';

export const tqManagementKey = {
    all: ['tq-management'] as const,
    lists: () => [...tqManagementKey.all, 'list'] as const,
    detail: (id: number) => [...tqManagementKey.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...tqManagementKey.all, 'byTender', tenderId] as const,
    items: (id: number) => [...tqManagementKey.all, 'items', id] as const,
    dashboardCounts: () => [...tqManagementKey.all, 'dashboard-counts'] as const,
};

export type TqManagementFilters = {
    tqStatus?: TenderQueryStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const useTqManagement = (filters?: TqManagementFilters) => {
    return useQuery({
        queryKey: [...tqManagementKey.lists(), filters],
        queryFn: () => tqManagementService.getAll(filters),
    });
};

export const useTqById = (id: number) => {
    return useQuery({
        queryKey: tqManagementKey.detail(id),
        queryFn: () => tqManagementService.getById(id),
        enabled: !!id,
    });
};

export const useTqByTender = (tenderId: number) => {
    return useQuery({
        queryKey: tqManagementKey.byTender(tenderId),
        queryFn: () => tqManagementService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

export const useTqItems = (id: number) => {
    return useQuery({
        queryKey: tqManagementKey.items(id),
        queryFn: () => tqManagementService.getTqItems(id),
        enabled: !!id,
    });
};

export const useCreateTqReceived = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: tqManagementService.createTqReceived,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqManagementKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: tqManagementKey.dashboardCounts() });
            toast.success('TQ received successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to create TQ');
        },
    });
};

export const useUpdateTqReplied = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            tqManagementService.updateTqReplied(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqManagementKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: tqManagementKey.dashboardCounts() });
            toast.success('TQ replied successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update TQ reply');
        },
    });
};

export const useUpdateTqMissed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            tqManagementService.updateTqMissed(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqManagementKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: tqManagementKey.dashboardCounts() });
            toast.success('TQ marked as missed');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to mark TQ as missed');
        },
    });
};

export const useMarkAsNoTq = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, qualified }: { tenderId: number; qualified: boolean }) =>
            tqManagementService.markAsNoTq(tenderId, qualified),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqManagementKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: tqManagementKey.dashboardCounts() });
            toast.success('Marked as No TQ');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to mark as No TQ');
        },
    });
};

export const useTqQualified = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tqId, qualified }: { tqId: number; qualified: boolean }) =>
            tqManagementService.tqQualified(tqId, qualified),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqManagementKey.all });
            queryClient.invalidateQueries({ queryKey: tqManagementKey.dashboardCounts() });
            toast.success('TQ marked as qualified');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to mark as TQ qualified');
        },
    });
};

export const useUpdateTqReceived = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            tqManagementService.updateTqReceived(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqManagementKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: tqManagementKey.dashboardCounts() });
            toast.success('TQ updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update TQ');
        },
    });
};

export const useTqManagementDashboardCounts = () => {
    return useQuery<TqManagementDashboardCounts>({
        queryKey: tqManagementKey.dashboardCounts(),
        queryFn: () => tqManagementService.getDashboardCounts(),
        staleTime: 30000,
        retry: 2,
    });
};
