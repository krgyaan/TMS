/* ===================== TYPES ===================== */

// ─── Query ────────────────────────────────────────────────────────────────────

export interface OemPerformanceQuery {
    oemId: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
}

// ─── API response (mirrors backend shape exactly) ─────────────────────────────

export interface SummaryItem {
    count: number;
    value: number;
    tenders: string[];
}

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

// ─── Component-level types (derived in hooks, consumed by dashboard) ──────────

export interface OemKpiSummary {
    totalTendersWithOem: number;
    tendersWon: number;
    totalValueWon: number;
    tendersLost: number;
    totalValueLost: number;
    tendersSubmitted: number;
    totalValueSubmitted: number;
    tendersNotAllowed: number;
    rfqsSent: number;
    rfqsResponded: number;
    winRate: number;
    rfqResponseRate: number;
}

export interface OemScoring {
    winRateScore: number;
    responseEfficiencyScore: number;
    complianceScore: number;
    total: number;
}

export interface TenderListRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    organizationName: string;
    teamMember: string;
    team: string;
    value: number;
    status: string;
}

export interface TendersByKpi {
    total: TenderListRow[];
    tendersWon: TenderListRow[];
    tendersLost: TenderListRow[];
    tendersSubmitted: TenderListRow[];
    tendersNotAllowed: NotAllowedTenderRow[];
    rfqsSent: RfqSentToOemRow[];
    rfqsResponded: TenderListRow[];
    winRate: TenderListRow[];
    rfqResponseRate: TenderListRow[];
}
