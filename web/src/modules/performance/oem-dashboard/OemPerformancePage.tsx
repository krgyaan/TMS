import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import type { OemPerformanceParams } from "./helpers/oem-performance.types";
import { exportToCSV } from "./helpers/oem-performance.mapper";

import OemFilterCard from "./components/OemFilterCard";
import TendersNotAllowedTable from "./components/TendersNotAllowedTable";
import RfqsSentTable from "./components/RfqsSentTable";
import WorkedWithOemTable from "./components/WorkedWithOemTable";

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

    // Same query key as the table components — served from cache, no extra request.
    const { data } = useOemPerformance(appliedParams);

    const tendersNotAllowed = useMemo(() => data?.tendersByKpi.tendersNotAllowed ?? [], [data]);
    const rfqsSent = useMemo(() => data?.tendersByKpi.rfqsSent ?? [], [data]);

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
                <CardContent>
                    {!appliedParams && (
                        <p className="text-sm text-muted-foreground">
                            No report selected. Please select an OEM and a date range, then press Submit.
                        </p>
                    )}
                </CardContent>
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
                    if (params) setAppliedParams(params);
                }}
            />

            {appliedParams && (
                <>
                    <TendersNotAllowedTable params={appliedParams} />
                    <RfqsSentTable params={appliedParams} />
                    <WorkedWithOemTable params={appliedParams} />
                </>
            )}
        </div>
    );
}
