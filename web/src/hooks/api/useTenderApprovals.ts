import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenderApprovalsService } from '@/services/api/tender-approvals.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import type { PaginatedResult, SaveTenderApprovalDto, TenderApprovalRow, TenderApprovalDashboardCounts, TenderApprovalFilters } from '@/types/api.types';
import { useTeamFilter } from '@/hooks/useTeamFilter';

export const tenderApprovalsKey = {
    all: ['tender-approvals'] as const,
    lists: () => [...tenderApprovalsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...tenderApprovalsKey.lists(), { filters }] as const,
    details: () => [...tenderApprovalsKey.all, 'detail'] as const,
    detail: (id: number) => [...tenderApprovalsKey.details(), id] as const,
    byTender: (tenderId: number) => [...tenderApprovalsKey.all, 'by-tender', tenderId] as const,
    dashboardCounts: () => [...tenderApprovalsKey.all, 'dashboard-counts'] as const,
}

export const useTenderApprovals = (
    tabKey?: 'pending' | 'accepted' | 'rejected' | 'tender-dnb',
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const { teamId, userId, dataScope } = useTeamFilter();
    // Pass effective teamId for both 'all' (admin) and 'team' scopes; for 'self' it will be null
    const teamIdParam = teamId !== null ? teamId : undefined;

    const params: TenderApprovalFilters = {
        ...(tabKey && { tabKey }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    const queryKeyFilters = {
        tabKey,
        ...pagination,
        ...sort,
        dataScope,
        teamId: teamId ?? null,
        userId: userId ?? null,
    };

    return useQuery<PaginatedResult<TenderApprovalRow>>({
        queryKey: tenderApprovalsKey.list(queryKeyFilters),
        queryFn: () => tenderApprovalsService.getAll(params, teamIdParam),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    })
};

export const useTenderApproval = (tenderId: number | null) => {
    return useQuery({
        queryKey: tenderId ? tenderApprovalsKey.detail(tenderId) : tenderApprovalsKey.detail(0),
        queryFn: () => tenderApprovalsService.getByTenderId(tenderId!),
        enabled: !!tenderId,
    });
};

export const useCreateTenderApproval = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: SaveTenderApprovalDto }) => tenderApprovalsService.create(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.detail(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.all });
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.dashboardCounts() });
            toast.success("Tender approval submitted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateTenderApproval = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: SaveTenderApprovalDto }) => tenderApprovalsService.update(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.detail(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.all });
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.dashboardCounts() });
            toast.success("Tender approval updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useTenderApprovalsDashboardCounts = () => {
    const { teamId, userId, dataScope } = useTeamFilter();
    const teamIdParam = teamId !== null ? teamId : undefined;
    const queryKey = [...tenderApprovalsKey.dashboardCounts(), dataScope, teamId ?? null, userId ?? null];

    return useQuery<TenderApprovalDashboardCounts>({
        queryKey,
        queryFn: () => tenderApprovalsService.getDashboardCounts(teamIdParam),
        staleTime: 0,
    });
};
