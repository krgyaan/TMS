// ─── DB row shapes (internal) ─────────────────────────────────────────────────

export interface TenderRow {
    id: number;
    team: number;
    teamName: string | null;
    tenderNo: string;
    tenderName: string;
    dueDate: Date;
    gstValues: string;
    organizationName: string | null;
    rfqTo: string | null;
    oemNotAllowed: string | null;
    tlStatus: number;
    teamMember: number | null;
    teamMemberName: string | null;
    status: number;
    rfqId: number | null;
    rfqCreatedAt: Date | null;
    rfqResponseReceiptDatetime: Date | null;
}

export interface BidTenderRow {
    tenderId: number;
    tenderName: string;
    gstValues: string;
    bidStatus: "Submission Pending" | "Bid Submitted" | "Tender Missed";
    tenderStatus: number;
    submissionDatetime: Date | null;
}

// ─── Summary item (mirrors Laravel's addToSummary shape) ─────────────────────

export interface SummaryItem {
    count: number;
    value: number;
    tenders: string[];
}

// ─── API response — mirrors Laravel's compact() output ───────────────────────
// Only 3 intentional changes from the original:
//   1. teamName + organizationName resolved server-side (was team bigint)
//   2. reason field added to NotAllowedTenderRow
//   3. rfqResponseOn: string | null instead of "Not Yet" string

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
}

export interface OemPerformanceResponse {
    summary: OemSummary;
    notAllowedTenders: NotAllowedTenderRow[];
    rfqsSentToOem: RfqSentToOemRow[];
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
