import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { locationPerformanceService } from "@/services/api/location-performance.service";
import type {
    ItemHeadingRow,
    ItemHeadingsResponse,
    LocationPerformanceParams,
    LocationPerformanceResponse,
} from "@/modules/performance/location-performance/helpers/location-performance.types";

// ─── Query key factory ────────────────────────────────────────────────────────

export const locationPerformanceKeys = {
    all: ["location-performance"] as const,
    report: (params: LocationPerformanceParams | null) => [...locationPerformanceKeys.all, "report", params] as const,
};

// ─── Fetchers (shared headings endpoint) ──────────────────────────────────────

async function fetchItemHeadings(): Promise<ItemHeadingRow[]> {
    const { data } = await api.get<ItemHeadingsResponse>("/performance/business/headings");
    return data.headings;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Re-export types for consumers
export type { LocationPerformanceParams };

export function useItemHeadings() {
    return useQuery({
        queryKey: ["item-headings"],
        queryFn: fetchItemHeadings,
        staleTime: 1000 * 60 * 10,
    });
}

export function useLocationPerformance(params: LocationPerformanceParams | null) {
    // `tab` is UI-only — exclude it from the query key so switching tabs
    // doesn't trigger a refetch of the same report data.
    const queryKeyParams = params ? { ...params, tab: undefined } : null;

    return useQuery<LocationPerformanceResponse>({
        queryKey: locationPerformanceKeys.report(queryKeyParams),
        queryFn: () => locationPerformanceService.getReport(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
