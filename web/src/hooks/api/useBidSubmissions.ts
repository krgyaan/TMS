import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bidSubmissionsService } from '@/services/api/bid-submissions.service';
import { toast } from 'sonner';
import type { PaginatedResult, BidSubmissionDashboardCounts, BidSubmissionDashboardRow, BidSubmissionListParams, SubmitBidDto, MarkAsMissedDto } from '@/types/api.types';

export const bidSubmissionsKey = {
    all: ['bid-submissions'] as const,
    lists: () => [...bidSubmissionsKey.all, 'list'] as const,
    detail: (id: number) => [...bidSubmissionsKey.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...bidSubmissionsKey.all, 'byTender', tenderId] as const,
    list: (filters?: Record<string, unknown>) => [...bidSubmissionsKey.lists(), { filters }] as const,
    dashboardCounts: () => [...bidSubmissionsKey.all, 'dashboard-counts'] as const,
};

export const useBidSubmissions = (
    tab?: 'pending' | 'submitted' | 'disqualified' | 'tender-dnb',
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: BidSubmissionListParams = {
        tab,
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

    return useQuery<PaginatedResult<BidSubmissionDashboardRow>>({
        queryKey: bidSubmissionsKey.list(queryKeyFilters),
        queryFn: () => bidSubmissionsService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useBidSubmissionById = (id: number) => {
    return useQuery({
        queryKey: bidSubmissionsKey.detail(id),
        queryFn: () => bidSubmissionsService.getById(id),
        enabled: !!id,
    });
};

export const useBidSubmissionByTender = (tenderId: number) => {
    return useQuery({
        queryKey: bidSubmissionsKey.byTender(tenderId),
        queryFn: () => bidSubmissionsService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

export const useSubmitBid = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubmitBidDto) => bidSubmissionsService.submitBid(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.dashboardCounts() });
            toast.success('Bid submitted successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit bid');
        },
    });
};

export const useMarkAsMissed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: MarkAsMissedDto) => bidSubmissionsService.markAsMissed(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.dashboardCounts() });
            toast.success('Tender marked as missed');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to mark as missed');
        },
    });
};

export const useUpdateBidSubmission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            bidSubmissionsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.dashboardCounts() });
            toast.success('Bid submission updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update bid submission');
        },
    });
};

export const useBidSubmissionsDashboardCounts = () => {
    return useQuery<BidSubmissionDashboardCounts>({
        queryKey: bidSubmissionsKey.dashboardCounts(),
        queryFn: () => bidSubmissionsService.getDashboardCounts(),
        staleTime: 30000, // Cache for 30 seconds
        retry: 2, // Retry failed requests twice
    });
};

export type { BidSubmissionDashboardRow };
