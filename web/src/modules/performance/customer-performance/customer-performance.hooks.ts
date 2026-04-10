import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

// useItemHeadings is shared — reuse the one from business performance
export { useItemHeadings } from "@/modules/performance/business-performance/business-performance.hooks";

import type { CustomerPerformanceResponse } from "./customer-performance.types";

// ─── Params ───────────────────────────────────────────────────────────────────

export interface CustomerPerformanceParams {
    org?: number;
    teamId?: number;
    itemHeading?: number;
    fromDate?: string;
    toDate?: string;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchCustomerPerformance(params: CustomerPerformanceParams): Promise<CustomerPerformanceResponse> {
    const { data } = await api.get<CustomerPerformanceResponse>("/performance/customer", {
        params: {
            org: params.org,
            teamId: params.teamId,
            itemHeading: params.itemHeading,
            fromDate: params.fromDate,
            toDate: params.toDate,
        },
    });
    return data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches customer performance report.
 * All filters optional — pass null to keep the query disabled until the
 * user hits Submit.
 */
export function useCustomerPerformance(params: CustomerPerformanceParams | null) {
    return useQuery({
        queryKey: ["customer-performance", params],
        queryFn: () => fetchCustomerPerformance(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
