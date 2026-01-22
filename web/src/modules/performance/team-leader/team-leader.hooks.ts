import { useQuery } from "@tanstack/react-query";
import { getPerformanceSummary, getPerformanceOutcomes, getStageMatrix, getTenderList, getPerformanceTrends, getExecutiveScoring } from "./team-leader.api";
import type { PerformanceQuery } from "./team-leader.types";

export const leaderPerformanceKeys = {
    root: ["performance"] as const,

    summary: (q: any) => [...leaderPerformanceKeys.root, "summary", q] as const,
    outcomes: (q: any) => [...leaderPerformanceKeys.root, "outcomes", q] as const,
    stageMatrix: (q: any) => [...leaderPerformanceKeys.root, "stage-matrix", q] as const,
    tenders: (q: any) => [...leaderPerformanceKeys.root, "tenders", q] as const,
    trends: (q: any) => [...leaderPerformanceKeys.root, "trends", q] as const,
    scoring: (q: any) => [...leaderPerformanceKeys.root, "scoring", q] as const,
};

/* ===================== SUMMARY ===================== */

export const usePerformanceSummary = (query: PerformanceQuery) => {
    return useQuery({
        queryKey: leaderPerformanceKeys.summary(query),
        queryFn: () => getPerformanceSummary(query),
        enabled: !!query.userId,
    });
};

/* ===================== OUTCOMES ===================== */

export const usePerformanceOutcomes = (query: PerformanceQuery) => {
    return useQuery({
        queryKey: leaderPerformanceKeys.outcomes(query),
        queryFn: () => getPerformanceOutcomes(query),
        enabled: !!query.userId,
    });
};

/* ===================== STAGE MATRIX ===================== */

export const useStageMatrix = (query: PerformanceQuery) => {
    return useQuery({
        queryKey: leaderPerformanceKeys.stageMatrix(query),
        queryFn: () => getStageMatrix(query),
        enabled: !!query.userId,
    });
};

export const useTenderList = (query: PerformanceQuery) =>
    useQuery({
        queryKey: leaderPerformanceKeys.tenders(query),
        queryFn: () => getTenderList(query),
        enabled: !!query.userId,
    });

export const usePerformanceTrends = (query: PerformanceQuery) =>
    useQuery({
        queryKey: leaderPerformanceKeys.trends(query),
        queryFn: () => getPerformanceTrends(query),
        enabled: !!query.userId,
    });

export const useExecutiveScoring = (query: PerformanceQuery) =>
    useQuery({
        queryKey: leaderPerformanceKeys.scoring(query),
        queryFn: () => getExecutiveScoring(query),
        enabled: !!query.userId,
    });
