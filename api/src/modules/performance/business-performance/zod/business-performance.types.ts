// ─── DB row shapes (internal) ─────────────────────────────────────────────────

export interface TenderRow {
    tenderId: number;
    tenderName: string;
    gstValues: string;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed";
    tenderStatus: number;
}

export interface AssignedTenderRow {
    id: number;
    tenderName: string;
    gstValues: string;
    tlStatus: number;
}

export interface EmdTenderRow {
    id: number;
    tenderName: string;
    gstValues: string;
    hasEmdPaid: boolean | null;
    hasEmdReturned: boolean | null;
}

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
    emd_paid: SummaryItem;
    emd_returned: SummaryItem;
    tenders_not_bid: SummaryItem;
}

export interface BusinessPerformanceResponse {
    items: ItemRow[];
    summary: BusinessSummary;
    tenderList: BusinessTenderListItem[];
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
