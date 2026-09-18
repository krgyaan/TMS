import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import type { OemPerformanceParams, TenderListItem } from "./helpers/oem-performance.types";
import { exportToCSV } from "./helpers/oem-performance.mapper";

import OemFilterCard from "./components/OemFilterCard";
import TendersNotAllowedTable from "./components/TendersNotAllowedTable";
import TendersMissedTable from "./components/TendersMissedTable";
import RfqsSentTable from "./components/RfqsSentTable";
import KpiTenderTable from "./components/KpiTenderTable";
import TenderCountBarChart from "./components/TenderCountBarChart";
import DonutChartPerformance from "./components/DonutChartPerformance";

export default function OemPerformancePage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Restore filters from the URL so a reload (or shared link) keeps the selection.
    const [selectedOemId, setSelectedOemId] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("oemId");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [fromDate, setFromDate] = useState<string | null>(() => new URLSearchParams(location.search).get("fromDate"));
    const [toDate, setToDate] = useState<string | null>(() => new URLSearchParams(location.search).get("toDate"));
    const [appliedParams, setAppliedParams] = useState<OemPerformanceParams | null>(() => {
        const search = new URLSearchParams(location.search);
        const rawOemId = search.get("oemId");
        const oemId = rawOemId !== null ? Number(rawOemId) : NaN;
        const from = search.get("fromDate");
        const to = search.get("toDate");
        if (!Number.isFinite(oemId) || !from || !to) return null;
        return { oemId, fromDate: from, toDate: to };
    });

    const params = useMemo(() => {
        if (!selectedOemId || !fromDate || !toDate) return null;

        return {
            oemId: selectedOemId,
            fromDate,
            toDate,
        };
    }, [selectedOemId, fromDate, toDate]);

    const { data: oems = [] } = useVendorOrganizations();

    // Same query key as the table components — served from cache, no extra request.
    const { data } = useOemPerformance(appliedParams);

    const tendersNotAllowed = useMemo(() => data?.tendersByKpi.tendersNotAllowed ?? [], [data]);
    const rfqsSent = useMemo(() => data?.tendersByKpi.rfqsSent ?? [], [data]);
    const tendersMissed = useMemo(() => data?.tendersByKpi.tendersMissed ?? [], [data]);
    const tendersDisqualified = useMemo(() => data?.tendersByKpi.tendersDisqualified ?? [], [data]);
    const tenderResultsAwaited = useMemo(() => data?.tendersByKpi.tenderResultsAwaited ?? [], [data]);
    const tendersBid = useMemo(() => data?.tendersByKpi.tendersSubmitted ?? [], [data]);
    const tendersWon = useMemo(() => data?.tendersByKpi.tendersWon ?? [], [data]);
    const tendersLost = useMemo(() => data?.tendersByKpi.tendersLost ?? [], [data]);

    const handleExportReport = useCallback(() => {
        const selectedOem = oems.find(o => o.id === selectedOemId);
        const oemName = selectedOem?.name || "Unknown OEM";

        // Export all tables data
        const allData: Record<string, string>[] = [];

        // Add Tenders Not Allowed
        tendersNotAllowed.forEach(t => {
            allData.push({
                section: "Tenders Not Allowed",
                member: t.member,
                team: t.team,
                tenderName: t.tenderName,
                tenderNo: t.tenderNo,
                gstValue: t.gstValues,
                dueDate: t.dueDate,
                reason: t.reason,
                rfqSentOn: "",
                rfqResponseOn: "",
            });
        });

        // Add RFQs Sent
        rfqsSent.forEach(t => {
            allData.push({
                section: "RFQs Sent",
                member: t.member,
                team: t.team,
                tenderName: t.tenderName,
                tenderNo: t.tenderNo,
                gstValue: t.gstValues,
                dueDate: t.dueDate,
                reason: "",
                rfqSentOn: t.rfqSentOn,
                rfqResponseOn: t.rfqResponseOn || "Pending",
            });
        });

        // Add missed tenders (rich row shape)
        tendersMissed.forEach(t => {
            allData.push({
                section: "Tenders Missed",
                member: t.member,
                team: t.team,
                tenderName: t.tenderName,
                tenderNo: t.tenderNo,
                gstValue: t.gstValues,
                dueDate: t.dueDate,
                reason: "",
                rfqSentOn: t.createdAt,
                rfqResponseOn: "",
            });
        });

        // Add lifecycle buckets
        const lifecycleSections: { section: string; rows: TenderListItem[] }[] = [
            { section: "Tenders Bid", rows: tendersBid },
            { section: "Tender Results Awaited", rows: tenderResultsAwaited },
            { section: "Tenders Disqualified", rows: tendersDisqualified },
            { section: "Tenders Won", rows: tendersWon },
            { section: "Tenders Lost", rows: tendersLost },
        ];

        for (const { section, rows } of lifecycleSections) {
            for (const t of rows) {
                allData.push({
                    section,
                    member: t.teamMember,
                    team: t.team,
                    tenderName: t.tenderName,
                    tenderNo: t.tenderNo,
                    gstValue: String(t.value),
                    dueDate: "",
                    reason: "",
                    rfqSentOn: "",
                    rfqResponseOn: "",
                });
            }
        }

        const headers = [
            { key: "section", label: "Section" },
            { key: "member", label: "Team Member" },
            { key: "team", label: "Team" },
            { key: "tenderName", label: "Tender Name" },
            { key: "tenderNo", label: "Tender No" },
            { key: "gstValue", label: "GST Value" },
            { key: "dueDate", label: "Due Date" },
            { key: "reason", label: "Reason" },
            { key: "rfqSentOn", label: "RFQ Sent On" },
            { key: "rfqResponseOn", label: "RFQ Response On" },
        ];

        const filename = `OEM_Performance_Report_${oemName}_${fromDate}_to_${toDate}`;
        exportToCSV(allData, filename, headers);
    }, [tendersNotAllowed, rfqsSent, tendersMissed, tendersBid, tenderResultsAwaited, tendersDisqualified, tendersWon, tendersLost, oems, selectedOemId, fromDate, toDate]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>OEM Performance Report</CardTitle>
                            <CardDescription>Analyze performance metrics and interactions with selected Original Equipment Manufacturers.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={handleExportReport} disabled={!appliedParams} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export Report
                        </Button>
                    </div>
                </CardHeader>
                <CardContent />
            </Card>

            <OemFilterCard
                oemOptions={oems.map(oem => ({ id: oem.id.toString(), name: oem.name }))}
                selectedOemId={selectedOemId}
                onSelectOem={setSelectedOemId}
                fromDate={fromDate}
                toDate={toDate}
                onFromDate={setFromDate}
                onToDate={setToDate}
                onSubmit={() => {
                    if (!params) return;
                    setAppliedParams(params);
                    const search = new URLSearchParams({
                        oemId: String(params.oemId),
                        fromDate: params.fromDate,
                        toDate: params.toDate,
                    });
                    navigate({ search: `?${search.toString()}` }, { replace: true });
                }}
            />

            {appliedParams && (
                <>
                    <TendersNotAllowedTable params={appliedParams} />
                    <TendersMissedTable params={appliedParams} />
                    <KpiTenderTable title="Tenders Bid" description="Tenders where a bid has been submitted." tenders={tendersBid} />
                    <KpiTenderTable title="Tender Results Awaited" description="Tenders awaiting final results." tenders={tenderResultsAwaited} />
                    <KpiTenderTable title="Tenders Disqualified" description="Tenders that were disqualified." tenders={tendersDisqualified} />
                    <KpiTenderTable title="Tenders Won" description="Tenders that were won." tenders={tendersWon} />
                    <KpiTenderTable title="Tenders Lost" description="Tenders that were lost." tenders={tendersLost} />
                    <RfqsSentTable params={appliedParams} />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TenderCountBarChart params={appliedParams} />
                        <DonutChartPerformance params={appliedParams} />
                    </div>
                </>
            )}
        </div>
    );
}
