import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

import type { CustomerPerformanceParams } from "./helpers/customer-performance.types";

/* ================================
   HELPERS
=============================== */
const titleCase = (str: string): string => {
    return str.replace(/_/g, " ").replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const AC_DC_OPTIONS: { id: string; name: string }[] = [
    { id: "combined", name: "All" },
    { id: "AC", name: "AC" },
    { id: "DC", name: "DC" },
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
    const location = useLocation();
    const navigate = useNavigate();

    // Restore filters from the URL so a reload (or shared link) keeps the selection.
    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("item");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [selectedOrganization, setSelectedOrganization] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("orgId");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [selectedTeamCategory, setSelectedTeamCategory] = useState<string>(() => {
        const raw = new URLSearchParams(location.search).get("team");
        return raw === "AC" || raw === "DC" ? raw : "combined";
    });
    const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(() => {
        return new URLSearchParams(location.search).get("year") ?? "";
    });
    const [appliedParams, setAppliedParams] = useState<CustomerPerformanceParams | null>(() => {
        const search = new URLSearchParams(location.search);
        const rawOrg = search.get("orgId");
        const orgId = rawOrg !== null ? Number(rawOrg) : NaN;
        const rawHeading = search.get("item");
        const headingId = rawHeading !== null ? Number(rawHeading) : NaN;
        const teamCategory = search.get("team");
        const year = search.get("year");
        const range = yearToDateRange(year);
        if (!range) return null;
        return {
            org: Number.isFinite(orgId) ? orgId : undefined,
            teamCategory: teamCategory === "AC" || teamCategory === "DC" ? teamCategory : undefined,
            itemHeading: Number.isFinite(headingId) ? headingId : undefined,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    });

    // Fetch headings for dropdown
    const { data: headings = [] } = useItemHeadings();
    const { data: organizations = [] } = useOrganizationsTrue();

    // Fetch customer performance data
    const { data, isLoading: dataLoading } = useCustomerPerformance(appliedParams);

    // Financial Year dropdown options
    const financialYearOptions = useMemo(() => buildFinancialYearOptions(), []);

    const activeYear = selectedFinancialYear;

    const handleFinancialYearChange = (v: string) => {
        setSelectedFinancialYear(v);
    };

    // Build params for submission
    const params = useMemo<CustomerPerformanceParams | null>(() => {
        const range = yearToDateRange(activeYear);
        if (!range) return null;
        return {
            org: selectedOrganization ?? undefined,
            teamCategory: selectedTeamCategory === "AC" || selectedTeamCategory === "DC" ? selectedTeamCategory : undefined,
            itemHeading: selectedHeadingId ?? undefined,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    }, [selectedOrganization, selectedTeamCategory, selectedHeadingId, activeYear]);

    // Handle form submission
    const handleSubmit = () => {
        if (!params) return;
        setAppliedParams(params);
        const search = new URLSearchParams();
        if (params.org !== undefined) search.set("orgId", String(params.org));
        if (params.teamCategory !== undefined) search.set("team", params.teamCategory);
        if (params.itemHeading !== undefined) search.set("item", String(params.itemHeading));
        if (activeYear) search.set("year", activeYear);
        navigate({ search: `?${search.toString()}` }, { replace: true });
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

        const filename = `Customer_Performance_${activeYear || "all"}`;
        exportToCSV(allData, filename, headers);
    }, [data, activeYear]);

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 w-full gap-4 items-end">
                            {/* Organization Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Organization</label>
                                <Combobox
                                    value={selectedOrganization ? selectedOrganization.toString() : ""}
                                    onChange={v => setSelectedOrganization(v ? Number(v) : null)}
                                    options={organizations.map(org => ({ id: org.id.toString(), name: `${org.name} (${org.acronym ?? ""})` }))}
                                    placeholder="Select Organization"
                                />
                            </div>

                            {/* AC / DC / All */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Team</label>
                                <Combobox
                                    value={selectedTeamCategory}
                                    onChange={v => setSelectedTeamCategory(v || "combined")}
                                    options={AC_DC_OPTIONS}
                                    placeholder="Select AC/DC"
                                />
                            </div>

                            {/* Item Heading Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Item Heading</label>
                                <Combobox
                                    value={selectedHeadingId ? selectedHeadingId.toString() : ""}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : null)}
                                    options={[{ id: "", name: "All" }, ...headings.map(heading => ({ id: heading.id.toString(), name: `${heading.name} (${heading.team})` }))]}
                                    placeholder="Select Item Heading"
                                />
                            </div>

                            {/* Financial Year */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Financial Year</label>
                                <Combobox value={selectedFinancialYear} onChange={handleFinancialYearChange} options={financialYearOptions} placeholder="Select Financial Year" />
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
                        <CustomerCategoryTable params={appliedParams} categoryKey="did_not_bid" title="Tender Did Not Bid" description="Tenders that were not bid for submission." />
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
