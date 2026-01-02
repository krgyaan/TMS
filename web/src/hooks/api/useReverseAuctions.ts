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
) => {
    const params: RaDashboardListParams = {
        ...filters,
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
        },
    });
};

export type { RaDashboardCounts, RaDashboardResponse };
