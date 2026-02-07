import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emdsService } from '@/services/api';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import { useTeamFilter } from '@/hooks/useTeamFilter';

export const paymentRequestsKey = {
    all: ['payment-requests'] as const,
    dashboard: () => [...paymentRequestsKey.all, 'dashboard'] as const,
    dashboardTab: (tab: string) => [...paymentRequestsKey.dashboard(), tab] as const,
    dashboardCounts: () => [...paymentRequestsKey.dashboard(), 'counts'] as const,
    lists: () => [...paymentRequestsKey.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...paymentRequestsKey.lists(), { filters }] as const,
    details: () => [...paymentRequestsKey.all, 'detail'] as const,
    detail: (id: number) => [...paymentRequestsKey.details(), id] as const,
    byTender: () => [...paymentRequestsKey.all, 'by-tender'] as const,
    byTenderId: (tenderId: number) => [...paymentRequestsKey.byTender(), tenderId] as const,
};

// Dashboard hook with counts
export const usePaymentDashboard = (
    tab: string = 'pending',
    pagination?: { page: number; limit: number },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
    search?: string
) => {
    const queryKeyFilters = {
        tab,
        ...pagination,
        ...sort,
        ...(search && { search }),
    };

    return useQuery({
        queryKey: [...paymentRequestsKey.dashboardTab(tab), queryKeyFilters],
        queryFn: () => emdsService.getDashboard({
            tab: tab as any,
            ...(pagination && { page: pagination.page, limit: pagination.limit }),
            ...(sort?.sortBy && { sortBy: sort.sortBy }),
            ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
            ...(search && { search }),
        }),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'counts' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

// Counts only hook (for initial tab badge rendering)
export const usePaymentDashboardCounts = () => {
    const { teamId, userId, dataScope } = useTeamFilter();
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;
    const queryKey = [...paymentRequestsKey.dashboardCounts(), dataScope, teamId ?? null, userId ?? null];
    
    return useQuery({
        queryKey,
        queryFn: () => emdsService.getDashboardCounts(teamIdParam),
        staleTime: 0,
    });
};

// Keep existing hooks for backward compatibility
export const usePaymentRequests = (statusFilter?: string) => {
    return useQuery({
        queryKey: paymentRequestsKey.list({ status: statusFilter }),
        queryFn: () => emdsService.getDashboard({ tab: statusFilter as any }).then(res => res.data),
    });
};

export const usePaymentRequestsByTender = (tenderId: number | null) => {
    return useQuery({
        queryKey: tenderId ? paymentRequestsKey.byTenderId(tenderId) : paymentRequestsKey.byTenderId(0),
        queryFn: () => emdsService.getByTenderId(tenderId!),
        enabled: !!tenderId,
    });
};

export const usePaymentRequest = (id: number | null) => {
    return useQuery({
        queryKey: id ? paymentRequestsKey.detail(id) : paymentRequestsKey.detail(0),
        queryFn: () => emdsService.getById(id!),
        enabled: !!id,
    });
};

export const useCreatePaymentRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: any }) =>
            emdsService.create(tenderId, data),
        onSuccess: (_, variables) => {
            // Invalidate all dashboard queries
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.dashboard() });
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.byTenderId(variables.tenderId) });
            toast.success('Payment request(s) created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdatePaymentRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            emdsService.update(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.dashboard() });
            if (data?.tenderId) {
                queryClient.invalidateQueries({ queryKey: paymentRequestsKey.byTenderId(data.tenderId) });
            }
            toast.success('Payment request updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdatePaymentStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
            emdsService.updateStatus(id, { status, remarks }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.dashboard() });
            if (data?.tenderId) {
                queryClient.invalidateQueries({ queryKey: paymentRequestsKey.byTenderId(data.tenderId) });
            }
            toast.success('Payment request status updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
