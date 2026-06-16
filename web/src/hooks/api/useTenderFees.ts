import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenderFeesService } from '@/services/api/tender-fees.service';
import type { DashboardFilters } from '@/modules/bi-dashboard/tender-fee/helpers/tenderFee.types';
import type { PaginatedResult } from '@/types/api.types';

export const tenderFeesKey = {
    all: ['tender-fees'] as const,
    dd: {
        all: ['tender-fees', 'dd'] as const,
        lists: () => ['tender-fees', 'dd', 'list'] as const,
        list: (filters?: Record<string, unknown>) => ['tender-fees', 'dd', 'list', { filters }] as const,
        counts: () => ['tender-fees', 'dd', 'counts'] as const,
    },
    portal: {
        all: ['tender-fees', 'portal'] as const,
        lists: () => ['tender-fees', 'portal', 'list'] as const,
        list: (filters?: Record<string, unknown>) => ['tender-fees', 'portal', 'list', { filters }] as const,
        counts: () => ['tender-fees', 'portal', 'counts'] as const,
    },
    transfer: {
        all: ['tender-fees', 'transfer'] as const,
        lists: () => ['tender-fees', 'transfer', 'list'] as const,
        list: (filters?: Record<string, unknown>) => ['tender-fees', 'transfer', 'list', { filters }] as const,
        counts: () => ['tender-fees', 'transfer', 'counts'] as const,
    },
    details: () => ['tender-fees', 'detail'] as const,
    detail: (id: number) => ['tender-fees', 'detail', id] as const,
    actionForm: (id: number) => ['tender-fees', 'action-form', id] as const,
    followup: (id: number) => ['tender-fees', 'followup', id] as const,
};

const buildQueryFilters = (filters?: DashboardFilters) => ({
    tab: filters?.tab,
    page: filters?.page,
    limit: filters?.limit,
    search: filters?.search,
    sortBy: filters?.sortBy,
    sortOrder: filters?.sortOrder,
    team: filters?.team,
});

export const useTenderFeeDDDashboard = (filters?: DashboardFilters) => {
    return useQuery<PaginatedResult<any>>({
        queryKey: tenderFeesKey.dd.list(buildQueryFilters(filters)),
        queryFn: () => tenderFeesService.getDDDashboard(filters),
        placeholderData: (prev) => prev,
    });
};

export const useTenderFeeDDDashboardCounts = () => {
    return useQuery({
        queryKey: tenderFeesKey.dd.counts(),
        queryFn: () => tenderFeesService.getDDCounts(),
    });
};

export const useTenderFeePortalDashboard = (filters?: DashboardFilters) => {
    return useQuery<PaginatedResult<any>>({
        queryKey: tenderFeesKey.portal.list(buildQueryFilters(filters)),
        queryFn: () => tenderFeesService.getPortalDashboard(filters),
        placeholderData: (prev) => prev,
    });
};

export const useTenderFeePortalDashboardCounts = () => {
    return useQuery({
        queryKey: tenderFeesKey.portal.counts(),
        queryFn: () => tenderFeesService.getPortalCounts(),
    });
};

export const useTenderFeeTransferDashboard = (filters?: DashboardFilters) => {
    return useQuery<PaginatedResult<any>>({
        queryKey: tenderFeesKey.transfer.list(buildQueryFilters(filters)),
        queryFn: () => tenderFeesService.getTransferDashboard(filters),
        placeholderData: (prev) => prev,
    });
};

export const useTenderFeeTransferDashboardCounts = () => {
    return useQuery({
        queryKey: tenderFeesKey.transfer.counts(),
        queryFn: () => tenderFeesService.getTransferCounts(),
    });
};

export const useTenderFeeDetails = (id: number) => {
    return useQuery({
        queryKey: tenderFeesKey.detail(id),
        queryFn: () => tenderFeesService.getById(id),
        enabled: !!id,
    });
};

export const useTenderFeeActionFormData = (id: number) => {
    return useQuery({
        queryKey: tenderFeesKey.actionForm(id),
        queryFn: () => tenderFeesService.getActionFormData(id),
        enabled: !!id,
    });
};

export const useTenderFeeFollowupData = (id: number) => {
    return useQuery({
        queryKey: tenderFeesKey.followup(id),
        queryFn: () => tenderFeesService.getFollowupData(id),
        enabled: !!id,
    });
};

export const useUpdateTenderFeeAction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            tenderFeesService.updateAction(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenderFeesKey.all });
        },
    });
};
