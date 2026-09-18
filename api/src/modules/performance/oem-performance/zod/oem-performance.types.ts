// ─── DB row shapes (internal) ─────────────────────────────────────────────────

export interface TenderRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: Date;
    gstValues: string;
    teamName: string | null;
    teamMemberName: string | null;
    tlStatus: number;
    status: number;
    sentToOem: boolean;
    notAllowedForOem: boolean;
}

export interface BidTenderRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed";
    tenderStatus: number;
    submissionDatetime: Date | null;
}

export interface RfqInfoRow {
    tenderId: number;
    rfqSentOn: Date | null;
    responseOn: Date | null;
}

// ─── Summary item ─────────────────────────────────────────────────────────────

export interface SummarizableTender {
    id: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string;
}

export interface TenderRef {
    id: number;
    tenderNo: string;
    tenderName: string;
    value: number;
}

export interface SummaryItem {
    count: number;
    value: number;
    tenders: TenderRef[];
}

// ─── API response ─────────────────────────────────────────────────────────────

export interface OemSummary {
    tendersAssigned: SummaryItem;
    tendersApproved: SummaryItem;
    tendersBid: SummaryItem;
    tendersMissed: SummaryItem;
    tendersDisqualified: SummaryItem;
    tenderResultsAwaited: SummaryItem;
    tendersWon: SummaryItem;
    tendersLost: SummaryItem;
}

export interface NotAllowedTenderRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string;
    gstValues: string;
    member: string;
    team: string;
    reason: string;
}

export interface RfqSentToOemRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string;
    gstValues: string;
    member: string;
    team: string;
    rfqSentOn: string;
    rfqResponseOn: string | null; // null = not yet responded
    createdAt: string;
}

export interface LifecycleTenderRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string;
    gstValues: string;
    member: string;
    team: string;
    createdAt: string;
    status: string;
}

export interface OemPerformanceResponse {
    summary: OemSummary;
    notAllowedTenders: NotAllowedTenderRow[];
    rfqsSentToOem: RfqSentToOemRow[];
    missedTenders: LifecycleTenderRow[];
    wonTenders: LifecycleTenderRow[];
    lostTenders: LifecycleTenderRow[];
    disqualifiedTenders: LifecycleTenderRow[];
    resultsAwaitedTenders: LifecycleTenderRow[];
    bidTenders: LifecycleTenderRow[];
    monthlyTrend: MonthlyTrendPoint[];
}

// ─── Monthly trend (Won / Missed / Lost per calendar month) ───────────────────

export interface MonthlyTrendPoint {
    month: string; // "2024-01" — sortable key
    label: string; // "Jan '24" — display label
    won: number;
    missed: number;
    lost: number;
    total: number; // won + missed + lost
}

// ─── Reason map (Laravel's TenderInfo::REASON) ────────────────────────────────

export const TENDER_REASON_MAP: Record<number, string> = {
    9: "OEM bidders only",
    10: "Not allowed by OEM",
    11: "Not eligible",
    12: "Product type bid",
    13: "Small value tender",
    14: "Product not available",
    15: "Electrical contractor license needed",
};
