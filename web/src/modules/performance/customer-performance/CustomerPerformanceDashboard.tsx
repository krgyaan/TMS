import { useState, useMemo, useCallback } from "react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Icons */
import { Filter, Download } from "lucide-react";

/* Custom Hooks */
import { useItemHeadings } from "@/modules/performance/business-performance/business-performance.hooks";
import { useCustomerPerformance } from "@/hooks/api/useCustomerPerformance";
import { useOrganizationsTrue } from "@/hooks/api/useOrganizations";
import { Combobox } from "@/components/form/SelectField";
import TendersAssignedTable from "./components/TendersAssignedTable";

import type { CustomerPerformanceParams, YearType } from "./helpers/customer-performance.types";

/* ================================
   HELPERS
=============================== */
const formatCurrency = (amount: number | string): string => {
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) {
        return "₹0";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(numericAmount);
};

const titleCase = (str: string): string => {
    return str.replace(/_/g, " ").replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const YEAR_TYPE_OPTIONS: { id: YearType; name: string }[] = [
    { id: "bidding", name: "Bidding Year" },
    { id: "financial", name: "Financial Year" },
    { id: "calendar", name: "Calendar Year" },
];

const AC_DC_OPTIONS: { id: string; name: string }[] = [
    { id: "AC", name: "AC" },
    { id: "DC", name: "DC" },
    { id: "combined", name: "Combined" },
];

/**
 * Build the list of selectable years for a given year type.
 *  - Financial Year: "2024-25" style, Apr–Mar, current FY + previous years
 *  - Calendar / Bidding Year: "2024" style, current year + previous years
 */
function buildYearOptions(type: YearType | null): { id: string; name: string }[] {
    const today = new Date();
    const currentYear = today.getFullYear();

    if (type === "financial") {
        const fiscalStartYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
        const options: { id: string; name: string }[] = [];
        for (let y = fiscalStartYear; y >= fiscalStartYear - 8; y--) {
            options.push({ id: `${y}-${String((y + 1) % 100).padStart(2, "0")}`, name: `${y}-${(y + 1) % 100}` });
        }
        return options;
    }

    const options: { id: string; name: string }[] = [];
    for (let y = currentYear; y >= currentYear - 8; y--) {
        options.push({ id: String(y), name: String(y) });
    }
    return options;
}

/**
 * Convert a year selection into fromDate/toDate strings.
 *  - Financial Year "2024-25" -> 2024-04-01 .. 2025-03-31
 *  - Calendar / Bidding Year "2024" -> 2024-01-01 .. 2024-12-31
 */
function yearToDateRange(type: YearType | null, year: string | null): { fromDate: string; toDate: string } | null {
    if (!type || !year) return null;

    if (type === "financial") {
        const match = /^(\d{4})-(\d{2})$/.exec(year);
        if (!match) return null;
        const startYear = Number(match[1]);
        const endYear = 2000 + Number(match[2]);
        return { fromDate: `${startYear}-04-01`, toDate: `${endYear}-03-31` };
    }

    const y = Number(year);
    if (!Number.isFinite(y)) return null;
    return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
}

/* ================================
   EXPORT UTILITIES
=============================== */
interface CsvHeader {
    key: string;
    label: string;
}

const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: CsvHeader[]) => {
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

/* ================================
   MAIN COMPONENT
=============================== */
export default function CustomerPerformanceDashboard() {
    // Filter States
    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(null);
    const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);
    const [selectedTeamCategory, setSelectedTeamCategory] = useState<string>("combined");
    const [selectedYearType, setSelectedYearType] = useState<YearType | null>("financial");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [appliedParams, setAppliedParams] = useState<CustomerPerformanceParams | null>(null);

    // Fetch headings for dropdown
    const { data: headings = [] } = useItemHeadings();
    const { data: organizations = [] } = useOrganizationsTrue();

    // Fetch customer performance data
    const { data, isLoading: dataLoading } = useCustomerPerformance(appliedParams);

    // Year dropdown options depend on the selected year type
    const yearOptions = useMemo(() => buildYearOptions(selectedYearType), [selectedYearType]);

    // Reset the selected year whenever the year type changes
    const handleYearTypeChange = (v: string) => {
        setSelectedYearType((v as YearType) || null);
        setSelectedYear("");
    };

    // Build params for submission
    const params = useMemo<CustomerPerformanceParams | null>(() => {
        const range = yearToDateRange(selectedYearType, selectedYear);
        if (!range) return null;
        return {
            org: selectedOrganization ?? undefined,
            teamCategory: selectedTeamCategory === "AC" || selectedTeamCategory === "DC" ? selectedTeamCategory : undefined,
            itemHeading: selectedHeadingId ?? undefined,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    }, [selectedOrganization, selectedTeamCategory, selectedHeadingId, selectedYearType, selectedYear]);

    // Handle form submission
    const handleSubmit = () => {
        if (params) {
            setAppliedParams(params);
        }
    };

    // Export handler
    const handleExportReport = useCallback(() => {
        if (!data) return;

        const allData: Record<string, unknown>[] = [];

        // Add summary data
        Object.entries(data.summary).forEach(([category, summaryData]) => {
            allData.push({
                section: "Summary",
                category: titleCase(category),
                count: summaryData.count,
                value: summaryData.value,
                tenders: summaryData.tender.join(", "),
            });
        });

        // Add item data
        Object.entries(data.metrics.by_item).forEach(([item, metricData]) => {
            allData.push({
                section: "Item Analysis",
                category: item,
                count: metricData.count,
                value: metricData.value,
                tenders: "",
            });
        });

        const headers = [
            { key: "section", label: "Section" },
            { key: "category", label: "Category" },
            { key: "count", label: "Count" },
            { key: "value", label: "Value" },
            { key: "tenders", label: "Tenders" },
        ];

        const filename = `Customer_Performance_${selectedYearType ?? "all"}_${selectedYear || "all"}`;
        exportToCSV(allData, filename, headers);
    }, [data, selectedYearType, selectedYear]);

    // Extract summary entries for rendering
    const summaryEntries = data?.summary ? Object.entries(data.summary) : [];

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Customer Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Analyze customer tenders by organization, team, item heading and year.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExportReport} disabled={!appliedParams || !data}>
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                {/* ===== FILTER CARD ===== */}
                <Card className="shadow-sm">
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-1">
                            {/* Organization Select */}
                            <div>
                                <label className="text-sm font-medium">Select Organization</label>
                                <Combobox
                                    value={selectedOrganization ? selectedOrganization.toString() : ""}
                                    onChange={v => setSelectedOrganization(v ? Number(v) : null)}
                                    options={organizations.map(org => ({ id: org.id.toString(), name: `${org.name} (${org.acronym ?? ""})` }))}
                                    placeholder="Select Organization"
                                />
                            </div>

                            {/* AC / DC / Combined */}
                            <div>
                                <label className="text-sm font-medium">Select AC/DC/Combined</label>
                                <Combobox
                                    value={selectedTeamCategory}
                                    onChange={v => setSelectedTeamCategory(v || "combined")}
                                    options={AC_DC_OPTIONS}
                                    placeholder="Select AC/DC"
                                />
                            </div>

                            {/* Item Heading Select */}
                            <div className="w-full">
                                <label className="text-sm font-medium">Select Item Heading</label>
                                <Combobox
                                    value={selectedHeadingId ? selectedHeadingId.toString() : ""}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : null)}
                                    options={[{ id: "", name: "Combined" }, ...headings.map(heading => ({ id: heading.id.toString(), name: `${heading.name} (${heading.team})` }))]}
                                    placeholder="Select Item Heading"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full justify-center items-center">
                            {/* Year Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Year Type</label>
                                <Combobox value={selectedYearType ?? ""} onChange={handleYearTypeChange} options={YEAR_TYPE_OPTIONS} placeholder="Select Year Type" />
                            </div>

                            {/* Year */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Year</label>
                                <Combobox value={selectedYear} onChange={v => setSelectedYear(v || "")} options={yearOptions} placeholder="Select Year" />
                            </div>
                        </div>

                        <div className="flex justify-center items-center w-full p-3">
                            {/* Submit Button */}
                            <Button onClick={handleSubmit} disabled={!params}>
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== CONDITIONAL CONTENT ===== */}
                {!appliedParams ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Please select a year to view the report.</span>
                    </div>
                ) : dataLoading ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Loading...</span>
                    </div>
                ) : (
                    <>
                        {/* ===== SUMMARY CARDS ===== */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {summaryEntries.map(([name, value]) => (
                                <Card key={name} className="shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="font-semibold text-lg">{titleCase(name)}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">
                                                Count: <span className="font-medium text-foreground">{value.count}</span>
                                            </p>
                                            <p className="text-xl font-bold text-orange-400">{formatCurrency(value.value)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* ===== TENDER SUMMARY TABLE ===== */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg">Tender Summary Details</CardTitle>
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
                                            {summaryEntries.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        No summary data available.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                summaryEntries.map(([name, value]) => (
                                                    <TableRow key={name} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="font-medium">{titleCase(name)}</TableCell>
                                                        <TableCell className="tabular-nums">{value.count}</TableCell>
                                                        <TableCell className="tabular-nums">{formatCurrency(value.value)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {value.tender.map((tender: string, idx: number) => (
                                                                    <Badge key={idx} variant="secondary" className="font-normal border border-gray-200">
                                                                        {tender}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ===== TENDERS ASSIGNED TABLE ===== */}
                        <TendersAssignedTable params={appliedParams} />
                    </>
                )}
            </div>
        </div>
    );
}
