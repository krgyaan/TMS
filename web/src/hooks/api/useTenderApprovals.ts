import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenderApprovalsService } from '@/services/api/tender-approvals.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import type { PaginatedResult, SaveTenderApprovalDto, TenderApprovalRow, TenderApprovalDashboardCounts, TenderApprovalFilters } from '@/types/api.types';

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
    tab?: '0' | '1' | '2' | '3' | 'tender-dnb' | 'pending' | 'accepted' | 'rejected',
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    // Map tab to tabKey (support both old numeric format and new string format)
    const tabKeyMap: Record<string, 'pending' | 'accepted' | 'rejected' | 'tender-dnb'> = {
        '0': 'pending',
        '1': 'accepted',
        '2': 'rejected',
        '3': 'pending', // Incomplete maps to pending
        'pending': 'pending',
        'accepted': 'accepted',
        'rejected': 'rejected',
        'tender-dnb': 'tender-dnb',
    };

    const tabKey = tab ? tabKeyMap[tab] : undefined;

    const params: TenderApprovalFilters = {
        ...(tabKey && { tabKey }),
        ...(tab && !tabKey && { tlStatus: Number(tab) }), // Fallback to legacy tlStatus if tabKey not found
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
    };

    return useQuery<PaginatedResult<TenderApprovalRow>>({
        queryKey: tenderApprovalsKey.list(queryKeyFilters),
        queryFn: () => tenderApprovalsService.getAll(params),
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
    return useQuery<TenderApprovalDashboardCounts>({
        queryKey: tenderApprovalsKey.dashboardCounts(),
        queryFn: () => tenderApprovalsService.getDashboardCounts(),
        staleTime: 30000, // Cache for 30 seconds
    });
};
