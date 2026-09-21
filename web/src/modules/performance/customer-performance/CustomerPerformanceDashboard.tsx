import { useState, useMemo, useCallback } from "react";

/* UI Components */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/form/SelectField";
import CustomerCategoryTable from "./components/CustomerCategoryTable";

/* Icons */
import { Filter, Download } from "lucide-react";

/* Custom Hooks */
import { useItemHeadings } from "@/modules/performance/business-performance/business-performance.hooks";
import { useCustomerPerformance } from "@/hooks/api/useCustomerPerformance";
import { useOrganizationsTrue } from "@/hooks/api/useOrganizations";

import type { CustomerPerformanceParams, YearType } from "./helpers/customer-performance.types";

/* ================================
   HELPERS
=============================== */
const titleCase = (str: string): string => {
    return str.replace(/_/g, " ").replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const AC_DC_OPTIONS: { id: string; name: string }[] = [
    { id: "AC", name: "AC" },
    { id: "DC", name: "DC" },
    { id: "combined", name: "Combined" },
];

/**
 * Build the list of selectable Financial Years: "2025-26" style (Apr–Mar), current FY + previous years.
 */
function buildFinancialYearOptions(): { id: string; name: string }[] {
    const today = new Date();
    const currentYear = today.getFullYear();
    const fiscalStartYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
    const options: { id: string; name: string }[] = [];
    for (let y = fiscalStartYear; y >= fiscalStartYear - 8; y--) {
        options.push({ id: `${y}-${String((y + 1) % 100).padStart(2, "0")}`, name: `${y}-${(y + 1) % 100}` });
    }
    return options;
}

/**
 * Build the list of selectable Calendar / Bidding Years: "2026" style (Jan–Dec), current year + previous years.
 */
function buildSimpleYearOptions(): { id: string; name: string }[] {
    const today = new Date();
    const currentYear = today.getFullYear();
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
    const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>("");
    const [selectedBiddingYear, setSelectedBiddingYear] = useState<string>("");
    const [selectedCalendarYear, setSelectedCalendarYear] = useState<string>("");
    const [appliedParams, setAppliedParams] = useState<CustomerPerformanceParams | null>(null);

    // Fetch headings for dropdown
    const { data: headings = [] } = useItemHeadings();
    const { data: organizations = [] } = useOrganizationsTrue();

    // Fetch customer performance data
    const { data, isLoading: dataLoading } = useCustomerPerformance(appliedParams);

    // Year dropdown options per year type
    const financialYearOptions = useMemo(() => buildFinancialYearOptions(), []);
    const biddingYearOptions = useMemo(() => buildSimpleYearOptions(), []);
    const calendarYearOptions = useMemo(() => buildSimpleYearOptions(), []);

    // The active year type comes from whichever year field has a value (mutually exclusive)
    const activeYearType: YearType | null = selectedFinancialYear ? "financial" : selectedBiddingYear ? "bidding" : selectedCalendarYear ? "calendar" : null;

    const activeYear = selectedFinancialYear || selectedBiddingYear || selectedCalendarYear;

    // Mutually exclusive handlers: selecting one year clears the other two
    const handleFinancialYearChange = (v: string) => {
        setSelectedFinancialYear(v);
        setSelectedBiddingYear("");
        setSelectedCalendarYear("");
    };

    const handleBiddingYearChange = (v: string) => {
        setSelectedBiddingYear(v);
        setSelectedFinancialYear("");
        setSelectedCalendarYear("");
    };

    const handleCalendarYearChange = (v: string) => {
        setSelectedCalendarYear(v);
        setSelectedFinancialYear("");
        setSelectedBiddingYear("");
    };

    // Build params for submission
    const params = useMemo<CustomerPerformanceParams | null>(() => {
        const range = yearToDateRange(activeYearType, activeYear);
        if (!range) return null;
        return {
            org: selectedOrganization ?? undefined,
            teamCategory: selectedTeamCategory === "AC" || selectedTeamCategory === "DC" ? selectedTeamCategory : undefined,
            itemHeading: selectedHeadingId ?? undefined,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    }, [selectedOrganization, selectedTeamCategory, selectedHeadingId, activeYearType, activeYear]);

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

        const filename = `Customer_Performance_${activeYearType ?? "all"}_${activeYear || "all"}`;
        exportToCSV(allData, filename, headers);
    }, [data, activeYearType, activeYear]);

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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full justify-center items-center">
                            {/* Financial Year */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Financial Year</label>
                                <Combobox value={selectedFinancialYear} onChange={handleFinancialYearChange} options={financialYearOptions} placeholder="Select Financial Year" />
                            </div>

                            {/* Bidding Year */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bidding Year</label>
                                <Combobox value={selectedBiddingYear} onChange={handleBiddingYearChange} options={biddingYearOptions} placeholder="Select Bidding Year" />
                            </div>

                            {/* Calendar Year */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Calendar Year</label>
                                <Combobox value={selectedCalendarYear} onChange={handleCalendarYearChange} options={calendarYearOptions} placeholder="Select Calendar Year" />
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
                        {/* ===== CATEGORY TABLES ===== */}
                        <CustomerCategoryTable params={appliedParams} categoryKey="assigned" title="Tenders Assigned" description="All tenders assigned to this customer." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="approved" title="Tenders Approved" description="Tenders that reached a result stage." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="missed" title="Tenders Missed" description="Tenders that were missed for submission." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="did_not_bid" title="Did Not Bid" description="Tenders that were not bid for submission." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="bid" title="Tenders Bid" description="Tenders where a bid has been submitted." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="results_awaited" title="Tender Results Awaited" description="Tenders awaiting final results." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="disqualified" title="Tenders Disqualified" description="Tenders that were disqualified." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="won" title="Tenders Won" description="Tenders that were won." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="lost" title="Tenders Lost" description="Tenders that were lost." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="emd_paid" title="EMD Paid" description="Tenders where the EMD has been paid." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="emd_returned" title="EMD Returned" description="Tenders where the EMD has been returned." />
                    </>
                )}
            </div>
        </div>
    );
}
