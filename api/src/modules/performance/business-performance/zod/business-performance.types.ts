// ─── DB row shapes (internal) ─────────────────────────────────────────────────

export interface TenderRow {
    id: number;
    tenderId: number;
    team: number;
    location: number;
    item: number;
    tenderName: string;
    gstValues: string;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed";
    tenderStatus: number;
    state: string | null;
    region: string | null;
    itemHeadingName: string | null;
    headingTeam: string | null;
    itemName: string | null;
    itemTeam: string | null;
}

export interface AssignedTenderRow {
    id: number;
    team: number;
    tenderName: string;
    gstValues: string;
    tlStatus: number;
    tenderStatus: number;
    state: string | null;
    region: string | null;
    itemName: string | null;
}

export interface ItemRow {
    id: number;
    name: string;
}

export interface ItemHeadingRow {
    id: number;
    name: string;
    team: string;
}

// ─── API response (mirrors Laravel compact() output exactly) ──────────────────

export interface SummaryItem {
    count: number;
    value: number;
    tender: string[]; // matches Laravel key name
}

export interface BusinessSummary {
    tenders_assigned: SummaryItem;
    tenders_approved: SummaryItem;
    tenders_bid: SummaryItem;
    tenders_missed: SummaryItem;
    tenders_disqualified: SummaryItem;
    tender_results_awaited: SummaryItem;
    tenders_won: SummaryItem;
    tenders_lost: SummaryItem;
}

export interface MetricEntry {
    count: number;
    value: number;
}

export interface BusinessMetrics {
    by_region: Record<string, MetricEntry>;
    by_state: Record<string, MetricEntry>;
    by_item: Record<string, MetricEntry>;
    total_count: number;
    total_value: number;
}

export interface BusinessPerformanceResponse {
    items: ItemRow[];
    summary: BusinessSummary;
    metrics: BusinessMetrics;
}

export interface ItemHeadingsResponse {
    headings: ItemHeadingRow[];
}
