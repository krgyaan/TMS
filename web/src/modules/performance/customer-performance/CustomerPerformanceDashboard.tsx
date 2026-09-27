import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* UI Components */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/form/SelectField";
import CustomerCategoryTable from "./components/CustomerCategoryTable";
import CustomerBarChart from "./components/CustomerBarChart";
import CustomerDonutChart from "./components/CustomerDonutChart";

/* Icons */
import { Filter, Download } from "lucide-react";

/* Custom Hooks */
import { useItemHeadings } from "@/hooks/api/useItemHeadings";
import { useCustomerPerformance } from "@/hooks/api/useCustomerPerformance";
import { useOrganizationsTrue } from "@/hooks/api/useOrganizations";
import { useTeams } from "@/hooks/api/useTeams";

import type { CustomerPerformanceParams } from "./helpers/customer-performance.types";

/* ================================
   HELPERS
=============================== */
const titleCase = (str: string): string => {
    return str.replace(/_/g, " ").replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const getGpColor = (gp: number | null | undefined): string => {
    if (gp === null || gp === undefined) return "text-muted-foreground";
    if (gp >= 20) return "text-green-600";
    if (gp >= 10) return "text-blue-600";
    if (gp >= 0) return "text-yellow-600";
    return "text-red-600";
};

const AC_DC_OPTIONS: { id: string; name: string }[] = [
    { id: "combined", name: "All" },
    { id: "AC", name: "AC" },
    { id: "DC", name: "DC" },
];

const CUSTOMER_PERFORMANCE_FILTERS_KEY = "customer-performance-filters";

interface CustomerPerformanceFilters {
    item: number | null;
    orgId: number | null;
    team: string;
    fromDate: string;
    toDate: string;
}

const isValidDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

function readCustomerPerformanceFilters(search: string): CustomerPerformanceFilters {
    const searchParams = new URLSearchParams(search);
    const hasUrlFilters = ["item", "orgId", "team", "fromDate", "toDate", "year"].some(key => searchParams.has(key));
    const source = hasUrlFilters ? searchParams : new URLSearchParams(localStorage.getItem(CUSTOMER_PERFORMANCE_FILTERS_KEY) ?? "");

    const rawItem = source.get("item");
    const rawOrgId = source.get("orgId");
    const parsedItem = rawItem !== null ? Number(rawItem) : NaN;
    const parsedOrgId = rawOrgId !== null ? Number(rawOrgId) : NaN;
    const team = source.get("team");
    const legacyYear = source.get("year");
    let fromDate = source.get("fromDate") ?? "";
    let toDate = source.get("toDate") ?? "";

    if ((!isValidDate(fromDate) || !isValidDate(toDate)) && legacyYear) {
        const match = /^(\d{4})-(\d{2})$/.exec(legacyYear);
        if (match) {
            fromDate = `${match[1]}-04-01`;
            toDate = `${2000 + Number(match[2])}-03-31`;
        }
    }

    const validRange = isValidDate(fromDate) && isValidDate(toDate) && fromDate <= toDate;

    return {
        item: Number.isFinite(parsedItem) ? parsedItem : null,
        orgId: Number.isFinite(parsedOrgId) ? parsedOrgId : null,
        team: team === "AC" || team === "DC" ? team : "combined",
        fromDate: validRange ? fromDate : "",
        toDate: validRange ? toDate : "",
    };
}

function writeCustomerPerformanceFilters(filters: CustomerPerformanceFilters): void {
    try {
        const params = new URLSearchParams();
        if (filters.item !== null) params.set("item", String(filters.item));
        if (filters.orgId !== null) params.set("orgId", String(filters.orgId));
        if (filters.team === "AC" || filters.team === "DC") params.set("team", filters.team);
        if (filters.fromDate) params.set("fromDate", filters.fromDate);
        if (filters.toDate) params.set("toDate", filters.toDate);
        localStorage.setItem(CUSTOMER_PERFORMANCE_FILTERS_KEY, params.toString());
    } catch {
        return;
    }
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
    const initialFilters = useMemo(() => readCustomerPerformanceFilters(location.search), [location.search]);
    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(initialFilters.item);
    const [selectedOrganization, setSelectedOrganization] = useState<number | null>(initialFilters.orgId);
    const [selectedTeamCategory, setSelectedTeamCategory] = useState<string>(initialFilters.team);
    const [fromDate, setFromDate] = useState<string>(initialFilters.fromDate);
    const [toDate, setToDate] = useState<string>(initialFilters.toDate);
    const [appliedParams, setAppliedParams] = useState<CustomerPerformanceParams | null>(() => {
        if (!initialFilters.fromDate || !initialFilters.toDate) return null;
        return {
            org: initialFilters.orgId ?? undefined,
            teamCategory: initialFilters.team === "AC" || initialFilters.team === "DC" ? initialFilters.team : undefined,
            itemHeading: initialFilters.item ?? undefined,
            fromDate: initialFilters.fromDate,
            toDate: initialFilters.toDate,
        };
    });

    useEffect(() => {
        if (location.search || !appliedParams) return;
        const search = new URLSearchParams();
        if (appliedParams.org !== undefined) search.set("orgId", String(appliedParams.org));
        if (appliedParams.teamCategory !== undefined) search.set("team", appliedParams.teamCategory);
        if (appliedParams.itemHeading !== undefined) search.set("item", String(appliedParams.itemHeading));
        search.set("fromDate", appliedParams.fromDate ?? "");
        search.set("toDate", appliedParams.toDate ?? "");
        navigate({ search: `?${search.toString()}` }, { replace: true });
    }, [appliedParams, location.search, navigate]);

    // Fetch headings for dropdown
    const { data: headings = [] } = useItemHeadings();
    const { data: teams = [] } = useTeams();
    const { data: organizations = [] } = useOrganizationsTrue();

    // Client-side join: attach team name to each heading
    const headingsWithTeams = useMemo(
        () =>
            headings.map(h => ({
                ...h,
                team: teams.find(t => t.id === (h as { team_id?: number }).team_id)?.name || "",
            })),
        [headings, teams]
    );

    // Fetch customer performance data
    const { data, isLoading: dataLoading } = useCustomerPerformance(appliedParams);

    const dateError = fromDate && toDate && fromDate > toDate ? "From Date must be on or before To Date" : null;

    // Build params for submission
    const params = useMemo<CustomerPerformanceParams | null>(() => {
        if (!fromDate || !toDate || dateError) return null;
        return {
            org: selectedOrganization ?? undefined,
            teamCategory: selectedTeamCategory === "AC" || selectedTeamCategory === "DC" ? selectedTeamCategory : undefined,
            itemHeading: selectedHeadingId ?? undefined,
            fromDate,
            toDate,
        };
    }, [dateError, fromDate, selectedHeadingId, selectedOrganization, selectedTeamCategory, toDate]);

    // Handle form submission
    const handleSubmit = () => {
        if (!params) return;
        setAppliedParams(params);
        const search = new URLSearchParams();
        if (params.org !== undefined) search.set("orgId", String(params.org));
        if (params.teamCategory !== undefined) search.set("team", params.teamCategory);
        if (params.itemHeading !== undefined) search.set("item", String(params.itemHeading));
        search.set("fromDate", params.fromDate ?? "");
        search.set("toDate", params.toDate ?? "");
        writeCustomerPerformanceFilters({
            item: selectedHeadingId,
            orgId: selectedOrganization,
            team: selectedTeamCategory,
            fromDate: params.fromDate ?? "",
            toDate: params.toDate ?? "",
        });
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

        const filename = `Customer_Performance_${appliedParams?.fromDate ?? ""}_to_${appliedParams?.toDate ?? ""}`;
        exportToCSV(allData, filename, headers);
    }, [appliedParams, data]);

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Customer Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Analyze customer tenders by organization, team, item heading and date range.</p>
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
                                    options={[
                                        { id: "", name: "All" },
                                        ...[...headingsWithTeams].sort((a, b) => a.name.localeCompare(b.name)).map(heading => ({ id: heading.id.toString(), name: heading.name })),
                                    ]}
                                    placeholder="Select Item Heading"
                                />
                            </div>

                            {/* From Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Date</label>
                                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                            </div>

                            {/* To Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">To Date</label>
                                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                            </div>

                            {/* Submit Button */}
                            <Button onClick={handleSubmit} disabled={!params} className="justify-self-center">
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </div>
                        {dateError && <p className="mt-2 text-sm text-destructive">{dateError}</p>}
                    </CardContent>
                </Card>

                {/* ===== CONDITIONAL CONTENT ===== */}
                {!appliedParams ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Please select a From Date and To Date to view the report.</span>
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
                        <CustomerCategoryTable
                            params={appliedParams}
                            categoryKey="did_not_bid"
                            title="Tender Did Not Bid"
                            description="Tenders that were not bid for submission."
                        />
                        <CustomerCategoryTable params={appliedParams} categoryKey="bid" title="Tenders Bid" description="Tenders where a bid has been submitted." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="results_awaited" title="Tender Results Awaited" description="Tenders awaiting final results." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="disqualified" title="Tenders Disqualified" description="Tenders that were disqualified." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="won" title="Tenders Won" description="Tenders that were won." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="lost" title="Tenders Lost" description="Tenders that were lost." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="emd_paid" title="EMD Paid" description="Tenders where the EMD has been paid." />
                        <CustomerCategoryTable params={appliedParams} categoryKey="emd_returned" title="EMD Returned" description="Tenders where the EMD has been returned." />

                        {/* ===== AVERAGE GP + CHARTS ===== */}
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
                                <CustomerBarChart params={appliedParams} />
                                <CustomerDonutChart params={appliedParams} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
