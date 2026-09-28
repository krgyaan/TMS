import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { businessPerformanceService } from "@/services/api/business-performance.service";
import type {
    BusinessPerformanceParams,
    BusinessPerformanceResponse,
    ItemHeadingRow,
    ItemHeadingsResponse,
} from "@/modules/performance/business-performance/helpers/business-performance.types";

// ─── Query key factory ────────────────────────────────────────────────────────

export const businessPerformanceKeys = {
    all: ["business-performance"] as const,
    report: (params: BusinessPerformanceParams | null) => [...businessPerformanceKeys.all, "report", params] as const,
};

// ─── Fetchers (shared headings endpoint) ──────────────────────────────────────

async function fetchItemHeadings(): Promise<ItemHeadingRow[]> {
    const { data } = await api.get<ItemHeadingsResponse>("/performance/business/headings");
    return data.headings;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches all active item headings for the filter dropdown.
 * Mirrors: ItemHeading::where('status', '1')->get()
 */
export function useItemHeadings() {
    return useQuery({
        queryKey: ["item-headings"],
        queryFn: fetchItemHeadings,
        staleTime: 1000 * 60 * 10, // headings rarely change
    });
}

/**
 * Fetches the full business performance report.
 * Pass null as params to keep the query disabled until the user submits the form.
 */
export function useBusinessPerformance(params: BusinessPerformanceParams | null) {
    return useQuery<BusinessPerformanceResponse>({
        queryKey: businessPerformanceKeys.report(params),
        queryFn: () => businessPerformanceService.getReport(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
