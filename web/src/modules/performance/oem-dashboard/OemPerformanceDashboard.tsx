import React, { useState, useMemo, useCallback } from "react";
/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/form/SelectField";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOemOutcomes } from "./oem-performance.hooks";

/* Icons */
import { Filter, Download, Calendar as CalendarIcon, Eye, Hammer, Mail, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";
import { paths } from "@/app/routes/paths";

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: string) => {
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount)) {
        return "₹0";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(numericAmount);
};

/* ================================
   PAGINATION HOOK
================================ */
function usePagination<T>(data: T[], itemsPerPage: number = 10) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / itemsPerPage);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    }, [data, currentPage, itemsPerPage]);

    const goToPage = useCallback(
        (page: number) => {
            setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
        },
        [totalPages]
    );

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const prevPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const firstPage = useCallback(() => {
        goToPage(1);
    }, [goToPage]);

    const lastPage = useCallback(() => {
        goToPage(totalPages);
    }, [goToPage, totalPages]);

    // Reset to page 1 when data changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    return {
        currentPage,
        totalPages,
        paginatedData,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        totalItems: data.length,
        startIndex: (currentPage - 1) * itemsPerPage + 1,
        endIndex: Math.min(currentPage * itemsPerPage, data.length),
    };
}

/* ================================
   PAGINATION COMPONENT
================================ */
interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    onFirstPage: () => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    onLastPage: () => void;
    onPageChange: (page: number) => void;
}

function PaginationControls({ currentPage, totalPages, totalItems, startIndex, endIndex, onFirstPage, onPrevPage, onNextPage, onLastPage }: PaginationControlsProps) {
    if (totalItems === 0) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startIndex}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{totalItems}</span>{" "}
                results
            </div>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onFirstPage} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">{totalPages || 1}</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNextPage} disabled={currentPage === totalPages || totalPages === 0}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onLastPage} disabled={currentPage === totalPages || totalPages === 0}>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/* ================================
   SEARCH INPUT COMPONENT
================================ */
interface TableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

function TableSearch({ value, onChange, placeholder = "Search..." }: TableSearchProps) {
    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="pl-9 h-9" />
        </div>
    );
}

/* ================================
   EXPORT UTILITIES
================================ */
const exportToCSV = (data: any[], filename: string, headers: { key: string; label: string }[]) => {
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

interface OemPerformanceParams {
    oemId: number;
    fromDate: string;
    toDate: string;
}

export default function OemPerformanceDashboard() {
    const [selectedOemId, setSelectedOemId] = useState<number | null>();
    const [fromDate, setFromDate] = useState<string | null>();
    const [toDate, setToDate] = useState<string | null>();
    const [appliedParams, setAppliedParams] = useState<OemPerformanceParams | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Search states for each table
    const [notAllowedSearch, setNotAllowedSearch] = useState("");
    const [rfqSearch, setRfqSearch] = useState("");
    const [workedWithSearch, setWorkedWithSearch] = useState("");

    const toggleExpand = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

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

    // Filtered data for Tenders Not Allowed
    const filteredNotAllowed = useMemo(() => {
        if (!notAllowedSearch.trim()) return tendersNotAllowed;
        const search = notAllowedSearch.toLowerCase();
        return tendersNotAllowed.filter(
            tender =>
                tender.member?.toLowerCase().includes(search) ||
                tender.tenderName?.toLowerCase().includes(search) ||
                tender.tenderNo?.toLowerCase().includes(search) ||
                tender.reason?.toLowerCase().includes(search) ||
                tender.team?.toLowerCase().includes(search)
        );
    }, [tendersNotAllowed, notAllowedSearch]);

    // Filtered data for RFQs Sent
    const filteredRfqs = useMemo(() => {
        if (!rfqSearch.trim()) return rfqsSent;
        const search = rfqSearch.toLowerCase();
        return rfqsSent.filter(
            tender =>
                tender.member?.toLowerCase().includes(search) ||
                tender.tenderName?.toLowerCase().includes(search) ||
                tender.tenderNo?.toLowerCase().includes(search) ||
                tender.team?.toLowerCase().includes(search)
        );
    }, [rfqsSent, rfqSearch]);

    // Worked with OEM data
    const workedWithData = useMemo(() => {
        if (!summary) return [];
        return [
            {
                category: "Total",
                count: summary.totalTendersWithOem,
                value: 0,
                tenders: tendersByKpi.total || [],
            },
            {
                category: "Won",
                count: summary.tendersWon,
                value: summary.totalValueWon,
                tenders: tendersByKpi.tendersWon || [],
            },
            {
                category: "Lost",
                count: summary.tendersLost,
                value: summary.totalValueLost,
                tenders: tendersByKpi.tendersLost || [],
            },
            {
                category: "Submitted",
                count: summary.tendersSubmitted,
                value: summary.totalValueSubmitted,
                tenders: tendersByKpi.tendersSubmitted || [],
            },
        ];
    }, [summary, tendersByKpi]);

    // Filtered worked with data
    const filteredWorkedWith = useMemo(() => {
        if (!workedWithSearch.trim()) return workedWithData;
        const search = workedWithSearch.toLowerCase();
        return workedWithData.filter(item => item.category.toLowerCase().includes(search) || item.tenders.some(t => t.tenderName?.toLowerCase().includes(search)));
    }, [workedWithData, workedWithSearch]);

    // Pagination hooks
    const notAllowedPagination = usePagination(filteredNotAllowed, 10);
    const rfqPagination = usePagination(filteredRfqs, 10);
    const workedWithPagination = usePagination(filteredWorkedWith, 10);

    // Export handler
    const handleExportReport = useCallback(() => {
        const selectedOem = oems.find(o => o.id === selectedOemId);
        const oemName = selectedOem?.name || "Unknown OEM";

        // Export all tables data
        const allData: any[] = [];

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

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select OEM</label>
                                <Combobox
                                    value={selectedOemId ? selectedOemId.toString() : ""}
                                    onChange={v => setSelectedOemId(v ? Number(v) : null)}
                                    options={oems.map(oem => ({ id: oem.id.toString(), name: oem.name }))}
                                    placeholder="Select OEM"
                                />
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
                        <div className="bg-muted rounded-full p-3 text-center mx-50">
                            <span className="justify-center">Please Select an OEM and Date</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* ===== TENDERS NOT ALLOWED TABLE ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Hammer className="h-5 w-5 text-destructive" />
                                            Tenders Not Allowed by This OEM
                                            <Badge variant="secondary">{tendersNotAllowed.length}</Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-1">List of tenders that could not proceed due to OEM specific restrictions or policies.</CardDescription>
                                    </div>
                                    <TableSearch value={notAllowedSearch} onChange={setNotAllowedSearch} placeholder="Search tenders..." />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-semibold">Team</TableHead>
                                                <TableHead className="font-semibold">Team Member</TableHead>
                                                <TableHead className="font-semibold">Tender</TableHead>
                                                <TableHead className="text-right font-semibold">Value</TableHead>
                                                <TableHead className="font-semibold">Due Date</TableHead>
                                                <TableHead className="text-right font-semibold">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {notAllowedPagination.paginatedData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                        {notAllowedSearch ? "No matching tenders found." : "No tenders found for this category."}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                notAllowedPagination.paginatedData.map(tender => (
                                                    <TableRow key={tender.id} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell>
                                                            <div className="font-medium">{tender.team}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{tender.member}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                                {tender.tenderName}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(tender.gstValues)}</TableCell>
                                                        <TableCell className="tabular-nums">{tender.dueDate}</TableCell>
                                                        <TableCell className="text-right">
                                                            <button
                                                                onClick={ev => {
                                                                    ev.stopPropagation();
                                                                    window.open(paths.tendering.tenderView(tender.id), "_blank");
                                                                }}
                                                                className="h-7 w-7 flex items-center justify-center rounded-md
                                                                                                text-muted-foreground hover:text-primary hover:bg-muted"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls
                                    currentPage={notAllowedPagination.currentPage}
                                    totalPages={notAllowedPagination.totalPages}
                                    totalItems={notAllowedPagination.totalItems}
                                    startIndex={notAllowedPagination.startIndex}
                                    endIndex={notAllowedPagination.endIndex}
                                    onFirstPage={notAllowedPagination.firstPage}
                                    onPrevPage={notAllowedPagination.prevPage}
                                    onNextPage={notAllowedPagination.nextPage}
                                    onLastPage={notAllowedPagination.lastPage}
                                    onPageChange={notAllowedPagination.goToPage}
                                />
                            </CardContent>
                        </Card>

                        {/* ===== RFQs SENT TO THIS OEM TABLE ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Mail className="h-5 w-5 text-purple-600" />
                                            RFQs Sent to This OEM
                                            <Badge variant="secondary">{rfqsSent.length}</Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-1">Detailed list of RFQs sent to this OEM and their response status.</CardDescription>
                                    </div>
                                    <TableSearch value={rfqSearch} onChange={setRfqSearch} placeholder="Search RFQs..." />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-semibold">Team</TableHead>
                                                <TableHead className="font-semibold">Team Member</TableHead>
                                                <TableHead className="font-semibold">Tender</TableHead>
                                                <TableHead className="text-right font-semibold">GST Value</TableHead>
                                                <TableHead className="font-semibold">Due Date</TableHead>
                                                <TableHead className="font-semibold">RFQ Sent On</TableHead>
                                                <TableHead className="font-semibold">Response On</TableHead>
                                                <TableHead className="text-right font-semibold">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rfqPagination.paginatedData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                        {rfqSearch ? "No matching RFQs found." : "No RFQs found for this category."}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rfqPagination.paginatedData.map(tender => (
                                                    <TableRow key={tender.id} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell>
                                                            <div className="font-medium">{tender.team}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{tender.member}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                                {tender.tenderName}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(tender.gstValues)}</TableCell>
                                                        <TableCell className="tabular-nums">{tender.dueDate}</TableCell>
                                                        <TableCell className="tabular-nums">{tender.rfqSentOn}</TableCell>
                                                        <TableCell>
                                                            {tender.rfqResponseOn ? (
                                                                <Badge variant="default" className="font-normal">
                                                                    {tender.rfqResponseOn}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="font-normal">
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <button
                                                                onClick={ev => {
                                                                    ev.stopPropagation();
                                                                    window.open(paths.tendering.tenderView(tender.id), "_blank");
                                                                }}
                                                                className="h-7 w-7 flex items-center justify-center rounded-md
                                                                                                text-muted-foreground hover:text-primary hover:bg-muted"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls
                                    currentPage={rfqPagination.currentPage}
                                    totalPages={rfqPagination.totalPages}
                                    totalItems={rfqPagination.totalItems}
                                    startIndex={rfqPagination.startIndex}
                                    endIndex={rfqPagination.endIndex}
                                    onFirstPage={rfqPagination.firstPage}
                                    onPrevPage={rfqPagination.prevPage}
                                    onNextPage={rfqPagination.nextPage}
                                    onLastPage={rfqPagination.lastPage}
                                    onPageChange={rfqPagination.goToPage}
                                />
                            </CardContent>
                        </Card>

                        {/* ===== ALL TENDERS WORKED WITH THIS OEM TABLE ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <CardTitle className="text-lg">Worked With This OEM</CardTitle>
                                    <TableSearch value={workedWithSearch} onChange={setWorkedWithSearch} placeholder="Search by category or tender..." />
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-semibold">Category</TableHead>
                                                <TableHead className="font-semibold">Count</TableHead>
                                                <TableHead className="font-semibold">Value</TableHead>
                                                <TableHead className="font-semibold">Tenders</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {workedWithPagination.paginatedData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        {workedWithSearch ? "No matching data found." : "No data available."}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                workedWithPagination.paginatedData.map(val => {
                                                    const isExpanded = expandedCategories.has(val.category);
                                                    const visibleTenders = isExpanded ? val.tenders : val.tenders.slice(0, 3);
                                                    return (
                                                        <TableRow key={val.category} className="hover:bg-muted/30 transition-colors">
                                                            <TableCell className="font-medium">{val.category}</TableCell>
                                                            <TableCell className="tabular-nums">{val.count}</TableCell>
                                                            <TableCell className="tabular-nums">{formatCurrency(val.value)}</TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-wrap gap-1 max-w-md">
                                                                    {visibleTenders.map(t => (
                                                                        <Badge key={t.id} variant="secondary" className="font-normal truncate max-w-[150px]" title={t.tenderName}>
                                                                            {t.tenderName}
                                                                        </Badge>
                                                                    ))}

                                                                    {val.tenders.length > 3 && (
                                                                        <Badge variant="outline" className="font-normal cursor-pointer" onClick={() => toggleExpand(val.category)}>
                                                                            {isExpanded ? "Show less" : `+${val.tenders.length - 3} more`}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls
                                    currentPage={workedWithPagination.currentPage}
                                    totalPages={workedWithPagination.totalPages}
                                    totalItems={workedWithPagination.totalItems}
                                    startIndex={workedWithPagination.startIndex}
                                    endIndex={workedWithPagination.endIndex}
                                    onFirstPage={workedWithPagination.firstPage}
                                    onPrevPage={workedWithPagination.prevPage}
                                    onNextPage={workedWithPagination.nextPage}
                                    onLastPage={workedWithPagination.lastPage}
                                    onPageChange={workedWithPagination.goToPage}
                                />
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
