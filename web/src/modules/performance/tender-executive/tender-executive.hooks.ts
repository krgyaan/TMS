import { useQuery } from "@tanstack/react-query";
import { getPerformanceSummary, getPerformanceOutcomes, getStageMatrix, getTenderList, getPerformanceTrends, getExecutiveScoring } from "./tender-executive.api";
import type { PerformanceQuery } from "./tender-executive.types";

export const performanceKeys = {
    root: ["performance"] as const,

    summary: (q: any) => [...performanceKeys.root, "summary", q] as const,
    outcomes: (q: any) => [...performanceKeys.root, "outcomes", q] as const,
    stageMatrix: (q: any) => [...performanceKeys.root, "stage-matrix", q] as const,
    tenders: (q: any) => [...performanceKeys.root, "tenders", q] as const,
    trends: (q: any) => [...performanceKeys.root, "trends", q] as const,
    scoring: (q: any) => [...performanceKeys.root, "scoring", q] as const,
};

/* ===================== SUMMARY ===================== */

export const usePerformanceSummary = (query: PerformanceQuery) => {
    return useQuery({
        queryKey: performanceKeys.summary(query),
        queryFn: () => getPerformanceSummary(query),
        enabled: !!query.userId,
    });
};

/* ===================== OUTCOMES ===================== */

export const usePerformanceOutcomes = (query: PerformanceQuery) => {
    return useQuery({
        queryKey: performanceKeys.outcomes(query),
        queryFn: () => getPerformanceOutcomes(query),
        enabled: !!query.userId,
    });
};

/* ===================== STAGE MATRIX ===================== */

export const useStageMatrix = (query: PerformanceQuery) => {
    return useQuery({
        queryKey: performanceKeys.stageMatrix(query),
        queryFn: () => getStageMatrix(query),
        enabled: !!query.userId,
    });
};

export const useTenderList = (query: PerformanceQuery) =>
    useQuery({
        queryKey: performanceKeys.tenders(query),
        queryFn: () => getTenderList(query),
        enabled: !!query.userId,
    });

export const usePerformanceTrends = (query: PerformanceQuery) =>
    useQuery({
        queryKey: performanceKeys.trends(query),
        queryFn: () => getPerformanceTrends(query),
        enabled: !!query.userId,
    });

export const useExecutiveScoring = (query: PerformanceQuery) =>
    useQuery({
        queryKey: performanceKeys.scoring(query),
        queryFn: () => getExecutiveScoring(query),
        enabled: !!query.userId,
    });
