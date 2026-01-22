import { useQuery } from "@tanstack/react-query";
import { fetchOemSummary, fetchOemTenders, fetchOemNotAllowed, fetchOemRfqs, fetchOemTrends, fetchOemScoring } from "./oem-performance.api";

interface Params {
    oemId: number;
    fromDate: string;
    toDate: string;
    metric?: string;
}

export function useOemSummary(params: Params, enabled: boolean) {
    return useQuery({
        queryKey: ["oem-summary", params],
        queryFn: () => fetchOemSummary(params),
        enabled,
    });
}

export function useOemTenders(params: Params, enabled: boolean) {
    return useQuery({
        queryKey: ["oem-tenders", params],
        queryFn: () => fetchOemTenders(params),
        enabled,
    });
}

export function useOemNotAllowed(params: Params, enabled: boolean) {
    return useQuery({
        queryKey: ["oem-not-allowed", params],
        queryFn: () => fetchOemNotAllowed(params),
        enabled,
    });
}

export function useOemRfqs(params: Params, enabled: boolean) {
    return useQuery({
        queryKey: ["oem-rfqs", params],
        queryFn: () => fetchOemRfqs(params),
        enabled,
    });
}

export function useOemTrends(params: Params, enabled: boolean) {
    return useQuery({
        queryKey: ["oem-trends", params],
        queryFn: () => fetchOemTrends(params),
        enabled,
    });
}

export function useOemScoring(params: Params, enabled: boolean) {
    return useQuery({
        queryKey: ["oem-scoring", params],
        queryFn: () => fetchOemScoring(params),
        enabled,
    });
}
