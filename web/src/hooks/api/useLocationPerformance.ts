import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { locationPerformanceService } from "@/services/api/location-performance.service";
import type {
    ItemHeadingRow,
    ItemHeadingsResponse,
    LocationPerformanceParams,
    LocationPerformanceResponse,
} from "@/modules/performance/location-performance/helpers/location-performance.types";

// Re-export types for consumers
export type { LocationPerformanceParams };

// ─── Query key factory ────────────────────────────────────────────────────────

export const locationPerformanceKeys = {
    all: ["location-performance"] as const,
    report: (params: LocationPerformanceParams | null) => [...locationPerformanceKeys.all, "report", params] as const,
};

// ─── Helpers (matching business-performance pattern) ──────────────────────────

/**
 * Build the list of selectable Financial Years: "2025-26" style (Apr–Mar),
 * current FY + previous years.
 */
export function buildFinancialYearOptions(): { id: string; name: string }[] {
    const today = new Date();
    const currentYear = today.getFullYear();
    const fiscalStartYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
    const options: { id: string; name: string }[] = [];
    for (let y = fiscalStartYear; y >= fiscalStartYear - 8; y--) {
        options.push({ id: `${y}-${String((y + 1) % 100).padStart(2, "0")}`, name: `${y}-${(y + 1) % 100}` });
    }
    return options;
}

/**
 * Convert a Financial Year selection like "2024-25" into fromDate/toDate strings (2024-04-01 .. 2025-03-31).
 */
export function yearToDateRange(year: string | null): { fromDate: string; toDate: string } | null {
    if (!year) return null;

    const match = /^(\d{4})-(\d{2})$/.exec(year);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endYear = 2000 + Number(match[2]);
    return { fromDate: `${startYear}-04-01`, toDate: `${endYear}-03-31` };
}

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
