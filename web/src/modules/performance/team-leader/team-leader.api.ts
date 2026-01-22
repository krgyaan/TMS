import api from "@/lib/axios";
import type { PerformanceOutcomes, PerformanceQuery, PerformanceSummary, StageMatrixResponse, TenderListRow, ExecutiveScoring, PerformanceTrends } from "./team-leader.types";

/* ===================== API CALLS ===================== */

export const getPerformanceSummary = async (params: PerformanceQuery): Promise<PerformanceSummary> => {
    const res = await api.get("/performance/team-leader/summary", { params });
    return res.data;
};

export const getPerformanceOutcomes = async (params: PerformanceQuery): Promise<PerformanceOutcomes> => {
    const res = await api.get("/performance/team-leader/outcomes", { params });
    return res.data;
};

export const getStageMatrix = async (params: PerformanceQuery): Promise<StageMatrixResponse> => {
    const res = await api.get("/performance/team-leader/stage-matrix", { params });
    return res.data;
};

export const getTenderList = async (params: PerformanceQuery): Promise<TenderListRow[]> => {
    const res = await api.get("/performance/team-leader/tenders", { params });
    console.log("Tender List API Response:", res.data);
    return res.data;
};

export const getPerformanceTrends = async (params: PerformanceQuery): Promise<PerformanceTrends> => {
    const res = await api.get("/performance/team-leader/trends", { params });
    return res.data;
};

export const getExecutiveScoring = async (params: PerformanceQuery): Promise<ExecutiveScoring> => {
    const res = await api.get("/performance/team-leader/scoring", { params });
    return res.data;
};
