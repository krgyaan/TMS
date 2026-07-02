import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

import type { LocationPerformanceResponse, ItemHeadingRow, ItemHeadingsResponse } from "./location-performance.types";

// ─── Params ───────────────────────────────────────────────────────────────────

export interface LocationPerformanceParams {
    headingId?: number;
    location?: number;
    area?: string;
    team?: number;
    fromDate: string;
    toDate: string;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchItemHeadings(): Promise<ItemHeadingRow[]> {
    // Shared endpoint — same headings used across business + location performance
    const { data } = await api.get<ItemHeadingsResponse>("/performance/business/headings");
    return data.headings;
}

async function fetchLocationPerformance(params: LocationPerformanceParams): Promise<LocationPerformanceResponse> {
    const { data } = await api.get<LocationPerformanceResponse>("/performance/location", {
        params: {
            heading: params.headingId,
            location: params.location,
            area: params.area,
            team: params.team,
            fromDate: params.fromDate,
            toDate: params.toDate,
        },
    });
    return data;
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
    return useQuery({
        queryKey: ["location-performance", params],
        queryFn: () => fetchLocationPerformance(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
