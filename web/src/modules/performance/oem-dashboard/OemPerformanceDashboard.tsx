import React, { useState, useMemo } from "react";
/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOemOutcomes } from "./oem-performance.hooks";

/* Icons */
import { Filter, Download, Calendar as CalendarIcon, Eye, Hammer, Mail } from "lucide-react";
import { useVendors } from "@/hooks/api/useVendors";
import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: number) => {
    if (typeof amount !== "number" || isNaN(amount)) {
        return "₹0";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatPercentage = (value: number) => {
    return `${value.toFixed(0)}%`;
};

type OemScoringKey = "Win Rate" | "Response Efficiency" | "Compliance";

export default function OemPerformanceDashboard() {
    const [selectedOemId, setSelectedOemId] = useState<number | null>(6);
    const [fromDate, setFromDate] = useState<string | null>("2025-01-01");
    const [toDate, setToDate] = useState<string | null>("2025-12-01");
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

    const { data } = useOemOutcomes(appliedParams);
    console.log("oem data", data);

    const summary = data?.summary;
    const tendersByKpi = data?.tendersByKpi ?? {};

    const tendersNotAllowed = tendersByKpi.tendersNotAllowed ?? [];
    const rfqsSent = tendersByKpi.rfqsSent ?? [];

    console.log("tendersByKpi keys:", Object.keys(tendersByKpi));

    const TENDER_OUTCOME_DATA = [
        { name: "Won", count: summary?.tendersWon, fill: "#10B981" }, // emerald-500
        { name: "Lost", count: summary?.tendersLost, fill: "#EF4444" }, // red-500
        { name: "Submitted", count: summary?.tendersSubmitted, fill: "#6366F1" }, // indigo-500
        { name: "Not Allowed", count: summary?.tendersNotAllowed, fill: "#F97316" }, // orange-500
    ];

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
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select OEM</label>
                                <Select value={selectedOemId ? selectedOemId.toString() : undefined} onValueChange={v => setSelectedOemId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select OEM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {oems?.map(oem => (
                                            <SelectItem key={oem.id} value={oem.id.toString()}>
                                                {oem.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={fromDate ?? ""} onChange={e => setFromDate(e.target.value || null)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">To Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={toDate ?? ""} onChange={e => setToDate(e.target.value || null)} />
                                </div>
                            </div>
                            <Button
                                onClick={() => {
                                    if (params) setAppliedParams(params);
                                }}
                            >
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                {!appliedParams ? (
                    <>
                        <div>Please Select an OEM and date</div>
                    </>
                ) : (
                    <>
                        {/* ===== TENDERS NOT ALLOWED TABLE ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Hammer className="h-5 w-5 text-destructive" />
                                    Tenders Not Allowed by This OEM
                                    <Badge variant="secondary">{tendersNotAllowed.length}</Badge>
                                </CardTitle>
                                <CardDescription>List of tenders that could not proceed due to OEM specific restrictions or policies.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Team Member</TableHead>
                                            <TableHead>Tender</TableHead>
                                            <TableHead className="text-right">GST Value</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tendersNotAllowed.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    No tenders found for this category.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            tendersNotAllowed.map(tender => (
                                                <TableRow key={tender.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{tender.teamMember}</div>
                                                        <div className="text-sm text-muted-foreground">{tender.team} Team</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                            {tender.tenderName}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(tender.gstValue)}</TableCell>
                                                    <TableCell>{tender.dueDate}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{tender.reason}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* ===== RFQs SENT TO THIS OEM TABLE ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-purple-600" />
                                    RFQs Sent to This OEM
                                    <Badge variant="secondary">{rfqsSent.length}</Badge>
                                </CardTitle>
                                <CardDescription>Detailed list of RFQs sent to this OEM and their response status.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Team Member</TableHead>
                                            <TableHead>Tender</TableHead>
                                            <TableHead className="text-right">GST Value</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>RFQ Sent On</TableHead>
                                            <TableHead>Response On</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rfqsSent.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                    No RFQs found for this category.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rfqsSent.map(tender => (
                                                <TableRow key={tender.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{tender.teamMember}</div>
                                                        <div className="text-sm text-muted-foreground">{tender.team} Team</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                            {tender.tenderName}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(tender.gstValue)}</TableCell>
                                                    <TableCell>{tender.dueDate}</TableCell>
                                                    <TableCell>{tender.rfqSentOn}</TableCell>
                                                    <TableCell>
                                                        {tender.rfqResponseOn ? (
                                                            <Badge variant="default">{tender.rfqResponseOn}</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Pending</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* ===== ALL TENDERS WORKED WITH THIS OEM TABLE (FILTERED BY SELECTED METRIC) ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg text-center">Worked With This OEM</CardTitle>
                            </CardHeader>

                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Count</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead>Tenders</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {summary &&
                                            Object.entries({
                                                total: {
                                                    count: summary.totalTendersWithOem,
                                                    value: 0,
                                                    tenders: tendersByKpi.total || [],
                                                },
                                                won: {
                                                    count: summary.tendersWon,
                                                    value: summary.totalValueWon,
                                                    tenders: tendersByKpi.tendersWon || [],
                                                },
                                                lost: {
                                                    count: summary.tendersLost,
                                                    value: summary.totalValueLost,
                                                    tenders: tendersByKpi.tendersLost || [],
                                                },
                                                submitted: {
                                                    count: summary.tendersSubmitted,
                                                    value: summary.totalValueSubmitted,
                                                    tenders: tendersByKpi.tendersSubmitted || [],
                                                },
                                            }).map(([key, val]) => (
                                                <TableRow key={key}>
                                                    <TableCell className="capitalize">{key}</TableCell>
                                                    <TableCell>{val.count}</TableCell>
                                                    <TableCell>{formatCurrency(val.value)}</TableCell>
                                                    <TableCell className="flex flex-wrap gap-1">
                                                        {val.tenders.map(t => (
                                                            <Badge key={t.id} variant="secondary">
                                                                {t.tenderName}
                                                            </Badge>
                                                        ))}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
