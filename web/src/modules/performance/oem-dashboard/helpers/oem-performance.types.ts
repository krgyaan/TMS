/* ===================== API TYPES (mirror backend response) ===================== */

// ─── Query ────────────────────────────────────────────────────────────────────

export interface OemPerformanceQuery {
    oemId: number | null;
    fromDate: string | null; // yyyy-mm-dd
    toDate: string | null; // yyyy-mm-dd
}

// ─── API response ─────────────────────────────────────────────────────────────

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

/* ===================== COMPONENT TYPES (produced by the mapper) ===================== */

/** Flat counts for KPI cards */
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

/** Scoring out of 100 for the scoring chart */
export interface OemScoring {
    winRateScore: number;
    responseEfficiencyScore: number;
    complianceScore: number;
    total: number;
}

/** Tender row for the general KPI list table */
export interface TenderListItem {
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
    total: TenderListItem[];
    tendersWon: TenderListItem[];
    tendersLost: TenderListItem[];
    tendersSubmitted: TenderListItem[];
    tendersNotAllowed: NotAllowedTenderRow[];
    rfqsSent: RfqSentToOemRow[];
    rfqsResponded: TenderListItem[];
    winRate: TenderListItem[]; // alias of tendersWon
    rfqResponseRate: TenderListItem[]; // alias of rfqsResponded
}

/** Full shape the components use — returned by useOemPerformance */
export interface OemComponentData {
    summary: OemKpiSummary;
    scoring: OemScoring;
    trends: []; // Not in Laravel module — empty, retained for component compat
    tendersByKpi: TendersByKpi;
}

/** Params accepted by useOemPerformance / the report endpoint */
export interface OemPerformanceParams {
    oemId: number;
    fromDate: string;
    toDate: string;
}
