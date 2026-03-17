import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { OemPerformanceResponse, OemSummary, NotAllowedTenderRow, RfqSentToOemRow } from "./oem-performance.types";

export interface OemPerformanceParams {
    oemId: number;
    fromDate: string;
    toDate: string;
}

// ─── Component-level types (what the dashboard consumes) ──────────────────────

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

/** Re-exported backend rows for the two dedicated tables */
export type { NotAllowedTenderRow as NotAllowedTenderItem, RfqSentToOemRow as RfqSentTenderItem };

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

/** Full shape the component uses — returned by useOemOutcomes */
export interface OemComponentData {
    summary: OemKpiSummary;
    scoring: OemScoring;
    trends: []; // Not in Laravel module — empty, retained for component compat
    tendersByKpi: TendersByKpi;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchOemPerformance(params: OemPerformanceParams): Promise<OemPerformanceResponse> {
    const { data } = await api.get<OemPerformanceResponse>("/performance/oem", {
        params: {
            oem: params.oemId,
            fromDate: params.fromDate,
            toDate: params.toDate,
        },
    });
    return data;
}

// ─── Transform backend → component shape ─────────────────────────────────────

function transform(raw: OemPerformanceResponse): OemComponentData {
    const { summary, notAllowedTenders, rfqsSentToOem } = raw;

    // Flat KPI counts — derived from the Laravel summary buckets
    const totalTendersWithOem = summary.tendersAssigned.count;
    const rfqsSent = rfqsSentToOem.length;
    const rfqsResponded = rfqsSentToOem.filter(r => r.rfqResponseOn !== null).length;
    const tendersWon = summary.tendersWon.count;
    const tendersSubmitted = summary.tendersBid.count;

    const winRate = tendersSubmitted > 0 ? Math.round((tendersWon / tendersSubmitted) * 100 * 10) / 10 : 0;
    const rfqResponseRate = rfqsSent > 0 ? Math.round((rfqsResponded / rfqsSent) * 100 * 10) / 10 : 0;

    const flatSummary: OemKpiSummary = {
        totalTendersWithOem,
        tendersWon,
        totalValueWon: summary.tendersWon.value,
        tendersLost: summary.tendersLost.count,
        totalValueLost: summary.tendersLost.value,
        tendersSubmitted,
        totalValueSubmitted: summary.tendersBid.value,
        tendersNotAllowed: notAllowedTenders.length,
        rfqsSent,
        rfqsResponded,
        winRate,
        rfqResponseRate,
    };

    // Scoring — computed from the flat rates above
    const winRateScore = Math.min(100, Math.round(winRate));
    const responseEfficiencyScore = Math.min(100, Math.round(rfqResponseRate));
    const complianceScore = totalTendersWithOem > 0 ? Math.min(100, Math.round((tendersSubmitted / totalTendersWithOem) * 100)) : 0;

    const scoring: OemScoring = {
        winRateScore,
        responseEfficiencyScore,
        complianceScore,
        total: Math.round((winRateScore + responseEfficiencyScore + complianceScore) / 3),
    };

    // Tender list builders — converts summary.tenders[] (names only) into TenderListItem[]
    // tendersBid/Won/Lost buckets only have tenderName — the tables only render
    // tenderName + value in those buckets which we have.
    const wonItems = toListItems(summary.tendersWon, "Won");
    const lostItems = toListItems(summary.tendersLost, "Lost");
    const bidItems = toListItems(summary.tendersBid, "Submitted");
    const totalItems = toListItems(summary.tendersAssigned, "Assigned");

    // rfqsSent uses the full row shape (has dueDate, rfqSentOn, rfqResponseOn)
    // notAllowed uses the full row shape (has reason, dueDate)
    const respondedItems = rfqsSentToOem.filter(r => r.rfqResponseOn !== null).map(r => rfqRowToListItem(r));

    const tendersByKpi: TendersByKpi = {
        total: totalItems,
        tendersWon: wonItems,
        tendersLost: lostItems,
        tendersSubmitted: bidItems,
        tendersNotAllowed: notAllowedTenders,
        rfqsSent: rfqsSentToOem,
        rfqsResponded: respondedItems,
        winRate: wonItems, // same bucket
        rfqResponseRate: respondedItems, // same bucket
    };

    return { summary: flatSummary, scoring, trends: [], tendersByKpi };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toListItems(item: { tenders: string[]; value: number; count: number }, status: string): TenderListItem[] {
    // summary buckets only carry tenderName — org/member not available without
    // a second query, which we intentionally avoid. Tables in these buckets
    // only render tenderName + value so this is sufficient.
    return item.tenders.map((name, i) => ({
        id: i,
        tenderNo: "—",
        tenderName: name,
        organizationName: "—",
        teamMember: "—",
        team: "—",
        value: item.count > 0 ? item.value / item.count : 0,
        status,
    }));
}

function rfqRowToListItem(r: RfqSentToOemRow): TenderListItem {
    return {
        id: r.id,
        tenderNo: r.tenderNo,
        tenderName: r.tenderName,
        organizationName: "—",
        teamMember: r.member,
        team: r.team,
        value: parseFloat(r.gstValues || "0"),
        status: "RFQ Responded",
    };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Primary hook used by the dashboard.
 * All other hooks are thin selectors over the same query key — no extra requests.
 */
export function useOemOutcomes(params: OemPerformanceParams | null) {
    return useQuery({
        queryKey: ["oem-performance", params],
        queryFn: () => fetchOemPerformance(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
        select: transform,
    });
}

// Kept for component import compat — not in Laravel module, always returns []
export function useOemTenderList(params: OemPerformanceParams | null) {
    return useQuery({
        queryKey: ["oem-performance", params],
        queryFn: () => fetchOemPerformance(params!),
        enabled: params !== null,
        staleTime: 1000 * 60 * 5,
        select: d => transform(d).tendersByKpi.total,
    });
}
