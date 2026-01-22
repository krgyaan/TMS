/* ===================== TYPES ===================== */

import { access } from "fs";

export interface PerformanceQuery {
    userId: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
    kpi?: string;
}

export interface PerformanceSummary {
    tendersHandled: number;
    stagesApplicable: number;
    stagesCompleted: number;
    stagesPending: number;
    stagesOnTime: number;
    stagesLate: number;
    completionRate: number;
    onTimeRate: number;
}

export type TenderKpiKey = "ALLOCATED" | "PENDING" | "APPROVED" | "REJECTED" | "BID" | "MISSED" | "DISQUALIFIED" | "RESULT_AWAITED" | "LOST" | "WON";

export type PerformanceOutcomes = {
    allocated: number;
    pending: number;
    approved: number;
    rejected: number;
    bid: number;
    missed: number;
    resultAwaited: number;
    won: number;
    lost: number;
    disqualified: number;
    notBid?: number;

    tendersByKpi: Record<
        TenderKpiKey,
        {
            id: number;
            tenderNo: string;
            tenderName: string;
            organizationName: string;
            dueDate: string; // ISO string
            value: number;
            statusBucket: TenderKpiKey;
        }[]
    >;
};

export interface StageMatrixRow {
    key: string;
    label: string;
    data: number[];
}

export interface StageMatrixResponse {
    stages: string[];
    rows: StageMatrixRow[];
}

export interface TenderListRow {
    id: number | null;
    tenderNo: string;
    tenderName: string;
    organizationName: string | null;
    value: number;
    status: "Result Awaited" | "Won" | "Lost" | "Missed" | "Not Bid";
    dueDate: string;
}

export interface PerformanceTrends {
    label: string;
    completion: number;
    onTime: number;
}

export interface ExecutiveScoring {
    workCompletion: number;
    onTimeWork: number;
    winRate: number;
    total: number;
}
