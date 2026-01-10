import { useQuery } from '@tanstack/react-query';
import { payOnPortalsService } from '@/services/api/pay-on-portals.service';
import type {
    PayOnPortalDashboardRow,
    PayOnPortalDashboardCounts,
    PayOnPortalDashboardFilters,
} from '@/modules/bi-dashboard/pay-on-portal/helpers/payOnPortal.types';
import type { PaginatedResult } from '@/types/api.types';

export const payOnPortalsKey = {
    all: ['pay-on-portals'] as const,
    lists: () => [...payOnPortalsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...payOnPortalsKey.lists(), { filters }] as const,
    details: () => [...payOnPortalsKey.all, 'detail'] as const,
    detail: (id: number) => [...payOnPortalsKey.details(), id] as const,
    counts: () => [...payOnPortalsKey.all, 'counts'] as const,
};

export const usePayOnPortalDashboard = (
    filters?: PayOnPortalDashboardFilters
) => {
    const params: PayOnPortalDashboardFilters = {
        ...filters,
    };

    const queryKeyFilters = { tab: filters?.tab, page: filters?.page, limit: filters?.limit, search: filters?.search };

    const query = useQuery<PaginatedResult<PayOnPortalDashboardRow>>({
        queryKey: payOnPortalsKey.list(queryKeyFilters),
        queryFn: async () => {
            const result = await payOnPortalsService.getAll(params);
            return result;
        },
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });

    return query;
};

export const usePayOnPortalDashboardCounts = () => {
    const query = useQuery<PayOnPortalDashboardCounts>({
        queryKey: payOnPortalsKey.counts(),
        queryFn: async () => {
            const result = await payOnPortalsService.getCounts();
            return result;
        },
    });

    return query;
};

export type { PayOnPortalDashboardRow, PayOnPortalDashboardCounts };
