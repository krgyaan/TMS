import type {
    OemComponentData,
    OemKpiSummary,
    OemPerformanceResponse,
    OemScoring,
    RfqSentToOemRow,
    SummaryItem,
    TenderListItem,
    TendersByKpi,
} from "./oem-performance.types";

// ─── Transform backend → component shape ─────────────────────────────────────

export function mapOemPerformance(raw: OemPerformanceResponse): OemComponentData {
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
        totalValueAssigned: summary.tendersAssigned.value,
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

    // Tender list builders — summary buckets now carry real per-tender refs
    // (id, tenderNo, value), so no fabrication is needed.
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

function toListItems(item: SummaryItem, status: string): TenderListItem[] {
    return item.tenders.map(t => ({
        id: t.id,
        tenderNo: t.tenderNo,
        tenderName: t.tenderName,
        organizationName: "—",
        teamMember: "—",
        team: "—",
        value: t.value,
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

/* ================================
    EXPORT UTILITIES
================================ */
export interface CsvHeader {
    key: string;
    label: string;
}

export const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: CsvHeader[]) => {
    if (data.length === 0) {
        alert("No data to export");
        return;
    }

    const csvHeaders = headers.map(h => h.label).join(",");
    const csvRows = data
        .map(row =>
            headers
                .map(h => {
                    const value = row[h.key];
                    // Escape quotes and wrap in quotes if contains comma
                    const stringValue = String(value ?? "");
                    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                })
                .join(",")
        )
        .join("\n");

    const csvContent = `${csvHeaders}\n${csvRows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
