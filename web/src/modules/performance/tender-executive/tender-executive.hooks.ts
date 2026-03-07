import { useQuery } from "@tanstack/react-query";
import {
    getPerformanceSummary,
    getPerformanceOutcomes,
    getStageMatrix,
    getTenderList,
    getPerformanceTrends,
    getExecutiveScoring,
    getExecutiveBacklog,
    getEmdBalance,
    getEmdCashFlow,
    getStageBacklogV2,
} from "./tender-executive.api";
import type { PerformanceQuery } from "./tender-executive.types";

export const performanceKeys = {
    root: ["performance"] as const,

    summary: (q: PerformanceQuery | null) => [...performanceKeys.root, "summary", q] as const,
    outcomes: (q: PerformanceQuery | null) => [...performanceKeys.root, "outcomes", q] as const,
    stageMatrix: (q: PerformanceQuery | null) => [...performanceKeys.root, "stage-matrix", q] as const,
    tenders: (q: PerformanceQuery | null) => [...performanceKeys.root, "tenders", q] as const,
    trends: (q: PerformanceQuery | null) => [...performanceKeys.root, "trends", q] as const,
    scoring: (q: PerformanceQuery | null) => [...performanceKeys.root, "scoring", q] as const,
    stageBacklog: (q: any) => ["stage-backlog", q] as const,
    stageBacklogV2: (q: any) => ["performance", "stage-backlog-v2", q],
    emdBalance: (q: any) => ["emd-balance", q] as const,
    emdCashFlow: (query: any) => ["performance", "emd-cashflow", query],
};

/* ===================== SUMMARY ===================== */

export const usePerformanceSummary = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.summary(query),
        queryFn: () => getPerformanceSummary(query!),
        enabled: !!query?.userId,
    });

export const usePerformanceOutcomes = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.outcomes(query),
        queryFn: () => getPerformanceOutcomes(query!),
        enabled: !!query?.userId,
    });

export const useStageMatrix = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.stageMatrix(query),
        queryFn: () => getStageMatrix(query!),
        enabled: !!query?.userId,
    });

export const useTenderList = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.tenders(query),
        queryFn: () => getTenderList(query!),
        enabled: !!query?.userId,
    });

export const usePerformanceTrends = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.trends(query),
        queryFn: () => getPerformanceTrends(query!),
        enabled: !!query?.userId,
    });

export const useExecutiveScoring = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.scoring(query),
        queryFn: () => getExecutiveScoring(query!),
        enabled: !!query?.userId,
    });

/* ================================
   USER + TEAM BACKLOG / EMD HOOKS
================================ */

export const useStageBacklog = (query: any) =>
    useQuery({
        queryKey: performanceKeys.stageBacklog(query),
        queryFn: () => getExecutiveBacklog(query),
        enabled: !!query?.fromDate && !!query?.toDate && ((query.view === "user" && !!query.userId) || (query.view === "team" && !!query.teamId)),
    });

export const useStageBacklogV2 = (query: any) =>
    useQuery({
        queryKey: performanceKeys.stageBacklogV2(query),
        queryFn: () => getStageBacklogV2(query),
        enabled: !!query.fromDate && !!query.toDate && ((query.view === "user" && !!query.userId) || (query.view === "team" && !!query.teamId)),
    });

export const useEmdBalance = (query: any) =>
    useQuery({
        queryKey: performanceKeys.emdBalance(query),
        queryFn: () => getEmdBalance(query),
        enabled: !!query?.fromDate && !!query?.toDate && ((query.view === "user" && !!query.userId) || (query.view === "team" && !!query.teamId)),
    });

export const useEmdCashFlow = (query: { view: "user" | "team"; userId?: number; teamId?: number; fromDate?: string; toDate?: string }) =>
    useQuery({
        queryKey: performanceKeys.emdCashFlow(query),
        queryFn: () =>
            getEmdCashFlow(
                query as {
                    view: "user" | "team";
                    userId?: number;
                    teamId?: number;
                    fromDate: string;
                    toDate: string;
                }
            ),
        enabled: !!query?.fromDate && !!query?.toDate && ((query.view === "user" && !!query.userId) || (query.view === "team" && !!query.teamId)),
    });
