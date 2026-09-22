/* ===================== TYPES ===================== */

// ─── Query ────────────────────────────────────────────────────────────────

export interface BusinessPerformanceQuery {
    headingId: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
}

export interface BusinessPerformanceParams {
    headingId: number;
    fromDate: string;
    toDate: string;
}

// ─── API response (mirrors backend shape exactly) ─────────────────────────────

export interface SummaryItem {
    count: number;
    value: number;
    tender: string[];
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
    emd_paid: SummaryItem;
    emd_returned: SummaryItem;
    tenders_not_bid: SummaryItem;
}

export interface BusinessPerformanceResponse {
    items: ItemRow[];
    summary: BusinessSummary;
    tenderList: BusinessTenderListItem[];
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
    category: string[];
}

export interface ItemHeadingsResponse {
    headings: ItemHeadingRow[];
}
