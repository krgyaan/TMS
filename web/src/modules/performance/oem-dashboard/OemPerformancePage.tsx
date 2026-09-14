import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import type { OemKpiSummary, OemPerformanceParams, TendersByKpi } from "./helpers/oem-performance.types";
import { exportToCSV } from "./helpers/oem-performance.mapper";

import OemFilterCard from "./components/OemFilterCard";
import TendersNotAllowedTable from "./components/TendersNotAllowedTable";
import RfqsSentTable from "./components/RfqsSentTable";
import WorkedWithOemTable from "./components/WorkedWithOemTable";

const EMPTY_SUMMARY: OemKpiSummary = {
    totalTendersWithOem: 0,
    tendersWon: 0,
    totalValueWon: 0,
    tendersLost: 0,
    totalValueLost: 0,
    tendersSubmitted: 0,
    totalValueSubmitted: 0,
    tendersNotAllowed: 0,
    rfqsSent: 0,
    rfqsResponded: 0,
    winRate: 0,
    rfqResponseRate: 0,
};

const EMPTY_TENDERS_BY_KPI: TendersByKpi = {
    total: [],
    tendersWon: [],
    tendersLost: [],
    tendersSubmitted: [],
    tendersNotAllowed: [],
    rfqsSent: [],
    rfqsResponded: [],
    winRate: [],
    rfqResponseRate: [],
};

export default function OemPerformancePage() {
    const [selectedOemId, setSelectedOemId] = useState<number | null>();
    const [fromDate, setFromDate] = useState<string | null>();
    const [toDate, setToDate] = useState<string | null>();
    const [appliedParams, setAppliedParams] = useState<OemPerformanceParams | null>(null);

    const params = useMemo(() => {
        if (!selectedOemId || !fromDate || !toDate) return null;

        return {
            oemId: selectedOemId,
            fromDate,
            toDate,
        };
    }, [selectedOemId, fromDate, toDate]);

    const { data: oems = [] } = useVendorOrganizations();

    const { data } = useOemPerformance(appliedParams);

    const summary = data?.summary ?? EMPTY_SUMMARY;
    const tendersByKpi = data?.tendersByKpi ?? EMPTY_TENDERS_BY_KPI;

    const tendersNotAllowed = useMemo(() => tendersByKpi.tendersNotAllowed ?? [], [tendersByKpi]);
    const rfqsSent = useMemo(() => tendersByKpi.rfqsSent ?? [], [tendersByKpi]);

    // Export handler
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
    }, [tendersNotAllowed, rfqsSent, oems, selectedOemId, fromDate, toDate]);

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER & FILTERS ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">OEM Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze performance metrics and interactions with selected Original Equipment Manufacturers.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExportReport} disabled={!appliedParams}>
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <OemFilterCard
                    oemOptions={oems.map(oem => ({ id: oem.id.toString(), name: oem.name }))}
                    selectedOemId={selectedOemId}
                    onSelectOem={setSelectedOemId}
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDate={setFromDate}
                    onToDate={setToDate}
                    onSubmit={() => {
                        if (params) setAppliedParams(params);
                    }}
                />

                {!appliedParams ? (
                    <>
                        <div className="bg-muted rounded-full p-3 text-center mx-50">
                            <span className="justify-center">Please Select an OEM and Date</span>
                        </div>
                    </>
                ) : (
                    <>
                        <TendersNotAllowedTable tenders={tendersNotAllowed} />
                        <RfqsSentTable rfqs={rfqsSent} />
                        <WorkedWithOemTable summary={summary} tendersByKpi={tendersByKpi} />
                    </>
                )}
            </div>
        </div>
    );
}
