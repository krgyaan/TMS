/* ===================== TYPES ===================== */

export interface PerformanceQuery {
    userId: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
    kpi?: string;
}

export interface StageQuery {
    view: "user" | "team";
    userId?: number;
    teamId?: number;
    fromDate: string;
    toDate: string;
}

export type TenderKpiKey = "ALLOCATED" | "PENDING" | "APPROVED" | "REJECTED" | "BID" | "MISSED" | "DISQUALIFIED" | "RESULT_AWAITED" | "LOST" | "WON";

export interface OutcomeTender {
    id: number;
    tenderNo: string | null;
    tenderName: string | null;
    organizationName: string | null;
    dueDate: string | null; // ISO string
    value: number;
    statusBucket: TenderKpiKey;
}

export interface PerformanceOutcomes {
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
    tendersByKpi?: Record<TenderKpiKey, OutcomeTender[]>;
}

export type StageMatrixRowKey = "done" | "onTime" | "late" | "pending" | "overdue" | "notApplicable";

export interface StageMatrixDrilldownItem {
    tenderId: number;
    tenderNo?: string | null;
    tenderName?: string | null;
    stageKey: string;
    deadline?: string | null;
    completedAt?: string | null;
    daysOverdue?: number | null;
    meta?: Record<string, string | number | boolean | null>;
}

export interface StageMatrixRow {
    key: StageMatrixRowKey;
    label: string;
    data: number[];
    drilldown: StageMatrixDrilldownItem[][];
}

export interface StageMatrixResponse {
    stages: string[];
    rows: StageMatrixRow[];
}

export interface MetricDrilldownItem {
    tenderId: number;
    tenderNo?: string | null;
    tenderName?: string | null;
    value: number;
    instrumentType?: string;
    transferDate?: string | null;
}

export interface MetricBucket {
    count: number;
    value: number;
    drilldown: MetricDrilldownItem[];
}

export interface StageBacklogBucket {
    count: number;
    value: number;
    drilldown: MetricDrilldownItem[];
}

export interface StageBacklogDuring {
    total: StageBacklogBucket;
    completed: StageBacklogBucket;
    pending?: StageBacklogBucket;
    rejected?: StageBacklogBucket;
    received?: StageBacklogBucket;
    disqualified?: StageBacklogBucket;
}

export interface StageBacklogStage {
    opening: StageBacklogBucket;
    total: StageBacklogBucket;
    during: StageBacklogDuring;
}

export interface StageBacklogV2Response {
    from: string;
    to: string;
    stages: {
        assigned: StageBacklogStage;
        approved: StageBacklogStage;
        bid: StageBacklogStage;
        resultAwaited: StageBacklogStage;
        won: StageBacklogStage;
        lost: StageBacklogStage;
    };
}
