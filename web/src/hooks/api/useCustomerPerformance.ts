import { useQuery } from "@tanstack/react-query";
import { customerPerformanceService } from "@/services/api/customer-performance.service";
import type { CustomerPerformanceParams, CustomerPerformanceResponse } from "@/modules/performance/customer-performance/helpers/customer-performance.types";

export const customerPerformanceKeys = {
    all: ["customer-performance"] as const,
    report: (params: CustomerPerformanceParams | null) => [...customerPerformanceKeys.all, "report", params] as const,
};

export function useCustomerPerformance(params: CustomerPerformanceParams | null) {
    return useQuery<CustomerPerformanceResponse>({
        queryKey: customerPerformanceKeys.report(params),
        queryFn: () => customerPerformanceService.getReport(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
