import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { locationPerformanceService } from "@/services/api/location-performance.service";
import type {
    ItemHeadingRow,
    ItemHeadingsResponse,
    LocationPerformanceParams,
    LocationPerformanceResponse,
} from "@/modules/performance/location-performance/helpers/location-performance.types";

// Re-export types consumed by module components
export type { LocationPerformanceParams };

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

export function useItemHeadings() {
    return useQuery({
        queryKey: ["item-headings"],
        queryFn: fetchItemHeadings,
        staleTime: 1000 * 60 * 10,
    });
}

export function useLocationPerformance(params: LocationPerformanceParams | null) {
    return useQuery<LocationPerformanceResponse>({
        queryKey: locationPerformanceKeys.report(params),
        queryFn: () => locationPerformanceService.getReport(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
