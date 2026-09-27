import { useQuery } from "@tanstack/react-query";
import { tenderExecutivePerformanceService } from "@/services/api/tender-executive-performance.service";
import type { PerformanceQuery, StageQuery } from "@/modules/performance/tender-executive/helpers/tender-executive.types";

export const performanceKeys = {
    root: ["performance"] as const,

    outcomes: (q: PerformanceQuery | null) => [...performanceKeys.root, "outcomes", q] as const,
    stageMatrix: (q: PerformanceQuery | null) => [...performanceKeys.root, "stage-matrix", q] as const,
    stageBacklogV2: (q: StageQuery) => ["performance", "stage-backlog-v2", q] as const,
    emdCashFlow: (q: StageQuery) => ["performance", "emd-cashflow", q] as const,
};

/* ===================== OUTCOMES ===================== */

export const usePerformanceOutcomes = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.outcomes(query),
        queryFn: () => {
            if (!query) {
                throw new Error("Performance query is required");
            }

            return tenderExecutivePerformanceService.getPerformanceOutcomes(query);
        },
        enabled: !!query?.userId,
    });

/* ===================== STAGE MATRIX ===================== */

export const useStageMatrix = (query: PerformanceQuery | null) =>
    useQuery({
        queryKey: performanceKeys.stageMatrix(query),
        queryFn: () => {
            if (!query) {
                throw new Error("Performance query is required");
            }

            return tenderExecutivePerformanceService.getStageMatrix(query);
        },
        enabled: !!query?.userId,
    });

/* ===================== STAGE BACKLOG ===================== */

export const useStageBacklogV2 = (query: StageQuery) =>
    useQuery({
        queryKey: performanceKeys.stageBacklogV2(query),
        queryFn: () => {
            if (!query.fromDate || !query.toDate) {
                throw new Error("Date range is required");
            }

            return tenderExecutivePerformanceService.getStageBacklogV2(query);
        },
        enabled: !!query.fromDate && !!query.toDate && ((query.view === "user" && !!query.userId) || (query.view === "team" && !!query.teamId)),
    });

/* ===================== EMD CASH FLOW ===================== */

export const useEmdCashFlow = (query: StageQuery) =>
    useQuery({
        queryKey: performanceKeys.emdCashFlow(query),
        queryFn: () => {
            if (!query.fromDate || !query.toDate) {
                throw new Error("Date range is required");
            }

            return tenderExecutivePerformanceService.getEmdCashFlow(query);
        },
        enabled: !!query.fromDate && !!query.toDate && ((query.view === "user" && !!query.userId) || (query.view === "team" && !!query.teamId)),
    });
