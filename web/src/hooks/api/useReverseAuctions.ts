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
import { useTeamFilter } from '@/hooks/useTeamFilter';

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
    const { teamId, userId, dataScope } = useTeamFilter();
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;
    const queryKey = [...reverseAuctionsKey.counts(), dataScope, teamId ?? null, userId ?? null];

    return useQuery<RaDashboardCounts>({
        queryKey,
        queryFn: () => reverseAuctionService.getDashboardCounts(teamIdParam),
        staleTime: 0,
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

// Fetch RA by tenderId
export const useReverseAuctionByTender = (tenderId: number) => {
    return useQuery<ReverseAuction>({
        queryKey: [...reverseAuctionsKey.details(), 'byTender', tenderId],
        queryFn: () => reverseAuctionService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

// Schedule RA mutation
export const useScheduleRa = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: ScheduleRaDto }) => reverseAuctionService.scheduleRa(tenderId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.all });
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.counts() });
        },
    });
};

// Upload RA result mutation
export const useUploadRaResult = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ raId, data }: { raId: number; data: UploadRaResultDto }) => reverseAuctionService.uploadResult(raId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.all });
            // Explicitly invalidate dashboard counts to ensure they refresh
            queryClient.invalidateQueries({ queryKey: reverseAuctionsKey.counts() });
        },
    });
};

export type { RaDashboardCounts, RaDashboardResponse };
