import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* UI Components */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* Icons */
import { Filter, Download } from "lucide-react";

/* Custom Hooks */
import { useItemHeadings, useBusinessPerformance } from "@/hooks/api/useBusinessPerformance";
import { Combobox } from "@/components/form/SelectField";

/* Types */
import type { BusinessPerformanceParams } from "./helpers/business-performance.types";

/* Components */
import BusinessCategoryTable from "./components/BusinessCategoryTable";
import BusinessBarChart from "./components/BusinessBarChart";
import BusinessDonutChart from "./components/BusinessDonutChart";

const getGpColor = (gp: number | null | undefined): string => {
    if (gp === null || gp === undefined) return "text-muted-foreground";
    if (gp >= 20) return "text-green-600";
    if (gp >= 10) return "text-blue-600";
    if (gp >= 0) return "text-yellow-600";
    return "text-red-600";
};

const titleCase = (str: string): string => {
    return str.replace(/_/g, " ").replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

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
 * Convert a Financial Year selection like "2024-25" into fromDate/toDate strings (2024-04-01 .. 2025-03-31).
 */
function yearToDateRange(year: string | null): { fromDate: string; toDate: string } | null {
    if (!year) return null;

    const match = /^(\d{4})-(\d{2})$/.exec(year);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endYear = 2000 + Number(match[2]);
    return { fromDate: `${startYear}-04-01`, toDate: `${endYear}-03-31` };
}

/* ================================
   EXPORT UTILITIES
=============================== */
const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: { key: string; label: string }[]) => {
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
export default function BusinessPerformanceDashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    // Filter States (initialised from URL params so the page can be shared/bookmarked)
    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("item");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(() => {
        return new URLSearchParams(location.search).get("year") ?? "";
    });
    const [appliedParams, setAppliedParams] = useState<BusinessPerformanceParams | null>(() => {
        const search = new URLSearchParams(location.search);
        const rawHeading = search.get("item");
        const headingId = rawHeading !== null ? Number(rawHeading) : NaN;
        const year = search.get("year");
        const range = yearToDateRange(year);
        if (!range || !Number.isFinite(headingId)) return null;
        return {
            headingId,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    });

    // Fetch headings for dropdown
    const { data: headings = [] } = useItemHeadings();

    // Fetch business performance data
    const { data, isLoading: dataLoading } = useBusinessPerformance(appliedParams);

    // Financial Year dropdown options
    const financialYearOptions = useMemo(() => buildFinancialYearOptions(), []);

    // Build params for submission
    const params = useMemo<BusinessPerformanceParams | null>(() => {
        const range = yearToDateRange(selectedFinancialYear);
        if (!range || !selectedHeadingId) return null;
        return {
            headingId: selectedHeadingId,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    }, [selectedHeadingId, selectedFinancialYear]);

    // Handle form submission
    const handleSubmit = () => {
        if (!params) return;
        setAppliedParams(params);

        const search = new URLSearchParams();
        search.set("item", String(params.headingId));
        if (selectedFinancialYear) search.set("year", selectedFinancialYear);
        navigate({ search: `?${search.toString()}` }, { replace: true });
    };

    // Export handler
    const handleExportReport = useCallback(() => {
        if (!data) return;

        const selectedHeading = headings.find(h => h.id === selectedHeadingId);
        const headingName = selectedHeading?.name || "Unknown";

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

        const headers = [
            { key: "section", label: "Section" },
            { key: "category", label: "Category" },
            { key: "count", label: "Count" },
            { key: "value", label: "Value" },
            { key: "tenders", label: "Tenders" },
        ];

        const filename = `Business_Performance_${headingName}_${selectedFinancialYear || "all"}`;
        exportToCSV(allData, filename, headers);
    }, [data, headings, selectedHeadingId, selectedFinancialYear]);

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Business Performance</h1>
                        <p className="text-muted-foreground mt-1">Analyze business performance metrics by item heading and date range.</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full gap-4 items-end">
                            {/* Item Heading Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Heading</label>
                                <Combobox
                                    value={selectedHeadingId ? selectedHeadingId.toString() : ""}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : null)}
                                    options={[...headings].sort((a, b) => a.name.localeCompare(b.name)).map(heading => ({ id: heading.id.toString(), name: `${heading.name}` }))}
                                    placeholder="Select Item Heading"
                                />
                            </div>

                            {/* Financial Year */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Financial Year</label>
                                <Combobox
                                    value={selectedFinancialYear}
                                    onChange={v => setSelectedFinancialYear(v)}
                                    options={financialYearOptions}
                                    placeholder="Select Financial Year"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button onClick={handleSubmit} disabled={!params} className="justify-self-center">
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== CONDITIONAL CONTENT ===== */}
                {!appliedParams ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Please select an Item Heading and Financial Year to view the report.</span>
                    </div>
                ) : dataLoading ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Loading...</span>
                    </div>
                ) : (
                    <>
                        {/* ===== CATEGORY TABLES ===== */}
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_assigned" title="Tenders Assigned" description="All tenders assigned in this period." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_approved" title="Tenders Approved" description="Tenders approved by the team lead." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_missed" title="Tenders Missed" description="Tenders that were missed for submission." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_not_bid" title="Tenders Did Not Bid" description="Tenders assigned but not bid on." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_bid" title="Tenders Bid" description="Tenders where a bid has been submitted." />
                        <BusinessCategoryTable
                            params={appliedParams}
                            categoryKey="tender_results_awaited"
                            title="Tender Results Awaited"
                            description="Tenders awaiting final results."
                        />
                        <BusinessCategoryTable
                            params={appliedParams}
                            categoryKey="tenders_disqualified"
                            title="Tenders Disqualified"
                            description="Tenders that were disqualified."
                        />
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_won" title="Tenders Won" description="Tenders that were won." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="tenders_lost" title="Tenders Lost" description="Tenders that were lost." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="emd_paid" title="EMD Paid" description="Tenders where the EMD has been paid." />
                        <BusinessCategoryTable params={appliedParams} categoryKey="emd_returned" title="EMD Returned" description="Tenders where the EMD has been returned." />

                        {/* ===== AVERAGE GP + CHARTS (bottom) ===== */}
                        <div className="space-y-4">
                            {/* Average GP Card - Full Width Row */}
                            <div className="grid grid-cols-1">
                                <Card className="shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="flex flex-wrap items-center gap-6">
                                            <p className="text-sm text-muted-foreground">Average GP</p>
                                            <p className={`text-3xl font-bold ${getGpColor(data?.avgGrossMargin)}`}>
                                                {data?.avgGrossMargin !== null && data?.avgGrossMargin !== undefined ? `${data.avgGrossMargin.toFixed(2)}%` : "—"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Average approved gross margin across tenders.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Bar Chart + Donut Chart - Side by Side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <BusinessBarChart params={appliedParams} />
                                <BusinessDonutChart params={appliedParams} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
