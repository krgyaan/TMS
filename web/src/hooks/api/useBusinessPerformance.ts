import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

import type {
    BusinessPerformanceParams,
    BusinessPerformanceResponse,
    ItemHeadingRow,
    ItemHeadingsResponse,
} from "@/modules/performance/business-performance/helpers/business-performance.types";

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchItemHeadings(): Promise<ItemHeadingRow[]> {
    const { data } = await api.get<ItemHeadingsResponse>("/performance/business/headings");
    return data.headings;
}

async function fetchBusinessPerformance(params: BusinessPerformanceParams): Promise<BusinessPerformanceResponse> {
    const { data } = await api.get<BusinessPerformanceResponse>("/performance/business", {
        params: {
            heading: params.headingId,
            fromDate: params.fromDate,
            toDate: params.toDate,
        },
    });
    return data;
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
 * Response shape mirrors Laravel: { items, summary, tenderList }
 */
export function useBusinessPerformance(params: BusinessPerformanceParams | null) {
    return useQuery({
        queryKey: ["business-performance", params],
        queryFn: () => fetchBusinessPerformance(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
