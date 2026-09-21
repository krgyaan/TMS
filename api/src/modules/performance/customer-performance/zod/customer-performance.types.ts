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

export interface CustomerTenderRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: Date;
    gstValues: string;
    member: string | null;
    team: string | null;
    status: number;
    rfqSentOn: Date | null;
    bidStatus: string | null;
    emd: string;
    emdMode: string | null;
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
