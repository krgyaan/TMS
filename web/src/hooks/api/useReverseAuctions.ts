import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    RaDashboardResponse,
    RaDashboardCounts,
    RaDashboardListParams,
    ReverseAuction,
    ScheduleRaDto,
    UploadRaResultDto,
} from '@/modules/tendering/ras/helpers/reverseAuction.types';
import { reverseAuctionService } from '@/services/api/reverse-auction.service';

export const reverseAuctionsKey = {
    all: ['reverse-auctions'] as const,
    dashboards: () => [...reverseAuctionsKey.all, 'dashboard'] as const,
    dashboard: (filters?: Record<string, unknown>) => [...reverseAuctionsKey.dashboards(), { filters }] as const,
    counts: () => [...reverseAuctionsKey.all, 'counts'] as const,
    details: () => [...reverseAuctionsKey.all, 'detail'] as const,
    detail: (id: number) => [...reverseAuctionsKey.details(), id] as const,
};

// Fetch RA dashboard data with counts
export const useReverseAuctionDashboard = (
    filters?: RaDashboardListParams,
    pagination?: { page: number; limit: number },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: RaDashboardListParams = {
        ...filters,
        ...pagination,
        ...sort,
    };

    return useQuery<RaDashboardResponse>({
        queryKey: reverseAuctionsKey.dashboard(params as Record<string, unknown>),
        queryFn: () => reverseAuctionService.getDashboard(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'counts' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

// Fetch only counts (for badges)
export const useReverseAuctionDashboardCounts = () => {
    return useQuery<RaDashboardCounts>({
        queryKey: reverseAuctionsKey.counts(),
        queryFn: () => reverseAuctionService.getDashboardCounts(),
        staleTime: 30000, // 30 seconds - counts don't need to be as fresh as data
        retry: 2,
    });
};

// Fetch single RA by ID
export const useReverseAuction = (id: number) => {
    return useQuery<ReverseAuction>({
        queryKey: reverseAuctionsKey.detail(id),
        queryFn: () => reverseAuctionService.getById(id),
        enabled: !!id,
    });
};

// Schedule RA mutation
export const useScheduleRa = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: ScheduleRaDto }) => reverseAuctionService.scheduleRa(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.counts() });
        },
    });
};

// Upload RA result mutation
export const useUploadRaResult = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UploadRaResultDto }) => reverseAuctionService.uploadResult(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.counts() });
        },
    });
};

export type { RaDashboardCounts, RaDashboardResponse };
