// ─── DB row shape (internal) ──────────────────────────────────────────────────

export interface TenderRow {
    id: number;
    tenderId: number;
    team: number;
    item: number;
    tenderName: string;
    gstValues: string;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed";
    tenderStatus: number;
    orgId: number | null;
    orgName: string | null;
    itemHeadingName: string | null;
}

// ─── API response (mirrors Laravel compact() output) ─────────────────────────

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
    // by_region / by_state intentionally omitted — locations not joined in this module
}

export interface CustomerPerformanceResponse {
    summary: CustomerSummary;
    metrics: CustomerMetrics;
}
