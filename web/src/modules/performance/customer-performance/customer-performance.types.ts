/* ===================== TYPES ===================== */

// ─── Query ────────────────────────────────────────────────────────────────────

export interface CustomerPerformanceQuery {
    org: number | null;
    teamId: number | null;
    itemHeading: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
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

export interface CustomerPerformanceResponse {
    summary: CustomerSummary;
    metrics: CustomerMetrics;
}
