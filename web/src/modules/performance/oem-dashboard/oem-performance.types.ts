/* ===================== TYPES ===================== */

import { access } from "fs";

export interface PerformanceQuery {
    userId: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
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

export interface PerformanceOutcomes {
    resultAwaited: number;
    missed: number;
    won: number;
    lost: number;
    notBid: number;
}

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
    velocity: number;
    accuracy: number;
    outcome: number;
    total: number;
}
