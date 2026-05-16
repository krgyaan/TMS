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
    itemName: string | null; // selected as items.name — keep this
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

export interface ItemHeadingsResponse {
    headings: ItemHeadingRow[];
}

// ─── API response (mirrors Laravel compact() output) ─────────────────────────

export interface SummaryItem {
    count: number;
    value: number;
    tender: string[];
}

export interface LocationSummary {
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

// total_count / total_value removed — service does not return them
export interface LocationMetrics {
    by_region: Record<string, MetricEntry>;
    by_state: Record<string, MetricEntry>;
    by_item: Record<string, MetricEntry>;
}

export interface LocationPerformanceResponse {
    items: ItemRow[];
    summary: LocationSummary;
    metrics: LocationMetrics;
}
