import { useQuery } from '@tanstack/react-query';
import { oemPerformanceService } from '@/services/api/oem-performance.service';
import { mapOemPerformance } from '@/modules/performance/oem-dashboard/helpers/oem-performance.mapper';
import type { OemComponentData, OemPerformanceParams } from '@/modules/performance/oem-dashboard/helpers/oem-performance.types';

export const oemPerformanceKeys = {
    all: ['oem-performance'] as const,
    report: (params: OemPerformanceParams | null) => [...oemPerformanceKeys.all, 'report', params] as const,
};

export function useOemPerformance(params: OemPerformanceParams | null) {
    return useQuery<OemComponentData>({
        queryKey: oemPerformanceKeys.report(params),
        queryFn: async () => {
            const raw = await oemPerformanceService.getReport(params!);
            return mapOemPerformance(raw);
        },
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
    });
}
