import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateContractAgreementDto } from '@/modules/operations/types/wo.types';
import { useTeamFilter } from '../useTeamFilter';
import { toast } from 'sonner';
import { contractAgreementApi } from '@/services/api/contract-agreement.api';

export const CONTRACT_AGREEMENT_KEYS = {
    all: ['contractAgreements'] as const,
    byWoDetailId: (id: number) => [...CONTRACT_AGREEMENT_KEYS.all, 'woDetailId', id] as const,
    lists: () => [...CONTRACT_AGREEMENT_KEYS.all, 'list'] as const,
    detail: (id: number) => [...CONTRACT_AGREEMENT_KEYS.all, 'detail', id] as const,
    list: (filters?: Record<string, unknown>) => [...CONTRACT_AGREEMENT_KEYS.lists(), { filters }] as const,
    dashboardCounts: (teamId?: number) => [...CONTRACT_AGREEMENT_KEYS.all, 'dashboardCounts', { teamId }] as const,
};

export const useContractAgreements = (
    tab?: 'uploaded' | 'not_uploaded',
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const { teamId, userId, dataScope } = useTeamFilter();
        // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
        const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;

        const params = {
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

    return useQuery({
        queryKey: CONTRACT_AGREEMENT_KEYS.list(queryKeyFilters),
        queryFn: () => contractAgreementApi.getAll(params, teamIdParam),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useContractAgreementDashboardCounts = () => {
    const { teamId, dataScope } = useTeamFilter();
    // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;

    return useQuery({
        queryKey: CONTRACT_AGREEMENT_KEYS.dashboardCounts(teamIdParam),
        queryFn: () => contractAgreementApi.getDashboardCounts(teamIdParam),
    });
};

export const useContractAgreement = (id: number) => {
    return useQuery({
        queryKey: CONTRACT_AGREEMENT_KEYS.byWoDetailId(id),
        queryFn: () => contractAgreementApi.getByWoDetailId(id),
        enabled: !!id,
    });
};

export const useContractAgreementByWoId = (woDetailId?: number) => {
    return useQuery({
        queryKey: CONTRACT_AGREEMENT_KEYS.byWoDetailId(woDetailId!),
        queryFn: () => contractAgreementApi.getByWoDetailId(woDetailId!),
        enabled: !!woDetailId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useSaveContractAgreement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateContractAgreementDto) => contractAgreementApi.updateContractAgreement(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CONTRACT_AGREEMENT_KEYS.all});
            queryClient.invalidateQueries({queryKey: CONTRACT_AGREEMENT_KEYS.dashboardCounts()});
        },

        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to schedule meeting');
        },
    });
};
