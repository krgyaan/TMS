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
    itemName: string | null;
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

// ─── Tender list (for category tables) ─────────────────────────────────────────

export interface BusinessTenderRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: Date;
    gstValues: string;
    member: string | null;
    team: string | null;
    itemName: string | null;
    status: number;
    tlStatus: number;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed" | null;
    hasEmdPaid: boolean | null;
    hasEmdReturned: boolean | null;
    avgGrossMargin: number | null;
}

export interface BusinessTenderListItem {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string;
    gstValues: string;
    member: string;
    team: string;
    item: string;
    status: string;
    bidStatus: string;
    avgGrossMargin: string | null;
    category: string[];
}

// ─── API response (mirrors Laravel compact() output exactly) ────────────────────

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

export interface LocationMetrics {
    by_region: Record<string, MetricEntry>;
    by_state: Record<string, MetricEntry>;
    by_item: Record<string, MetricEntry>;
    total_count: number;
    total_value: number;
}

export interface LocationPerformanceResponse {
    items: ItemRow[];
    summary: LocationSummary;
    metrics: LocationMetrics;
    tenderList: BusinessTenderListItem[];
    avgGrossMargin: number | null;
}
