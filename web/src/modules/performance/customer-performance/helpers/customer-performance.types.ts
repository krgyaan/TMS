/* ===================== TYPES ===================== */

// ─── Query ────────────────────────────────────────────────────────────────────

export type TeamCategory = "AC" | "DC";

export type YearType = "bidding" | "financial" | "calendar";

export interface CustomerPerformanceQuery {
    org: number | null;
    teamCategory: TeamCategory | null;
    itemHeading: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
}

// ─── Params ───────────────────────────────────────────────────────────────────

export interface CustomerPerformanceParams {
    org?: number;
    teamCategory?: TeamCategory;
    itemHeading?: number;
    fromDate?: string;
    toDate?: string;
}

// ─── API response (mirrors backend shape exactly) ─────────────────────────────

export interface SummaryItem {
    count: number;
    value: number;
    tender: string[];
}

export interface CustomerSummary {
    tenders_assigned: SummaryItem;
    tenders_approved: SummaryItem;
    tenders_missed: SummaryItem;
    tenders_bid: SummaryItem;
    tender_results_awaited: SummaryItem;
    tenders_disqualified: SummaryItem;
    tenders_won: SummaryItem;
    tenders_lost: SummaryItem;
}

export interface MetricEntry {
    count: number;
    value: number;
}

export interface CustomerMetrics {
    total_value: number;
    total_count: number;
    by_item: Record<string, MetricEntry>;
}

export interface TenderListItem {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string;
    gstValues: string;
    member: string;
    team: string;
    createdAt: string;
    status: string;
    bidStatus: string;
    category: string[];
    emd: string;
    emdMode: string | null;
}

export interface CustomerPerformanceResponse {
    summary: CustomerSummary;
    metrics: CustomerMetrics;
    tenderList: TenderListItem[];
}
