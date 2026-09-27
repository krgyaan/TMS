import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* UI Components */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* Icons */
import { Filter, Download, Calendar as CalendarIcon } from "lucide-react";

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

const persistedSelectionKey = "business-performance-selection";

function isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getInitialSelection(search: string): { item: number | null; fromDate: string; toDate: string } {
    const params = new URLSearchParams(search);
    const readParams = (source: URLSearchParams) => {
        const rawItem = source.get("item");
        const item = rawItem !== null ? Number(rawItem) : null;
        const fromDate = source.get("fromDate") ?? "";
        const toDate = source.get("toDate") ?? "";
        const validRange = isValidDate(fromDate) && isValidDate(toDate) && fromDate <= toDate;
        return { item: item !== null && Number.isFinite(item) ? item : null, fromDate: validRange ? fromDate : "", toDate: validRange ? toDate : "" };
    };

    if (["item", "fromDate", "toDate", "year"].some(key => params.has(key))) {
        const legacy = params.get("year");
        if (legacy) {
            const match = /^(\d{4})-(\d{2})$/.exec(legacy);
            if (match) {
                const itemValue = Number(params.get("item"));
                return { item: Number.isFinite(itemValue) ? itemValue : null, fromDate: `${match[1]}-04-01`, toDate: `${2000 + Number(match[2])}-03-31` };
            }
        }
        return readParams(params);
    }

    try {
        const stored = localStorage.getItem(persistedSelectionKey);
        if (!stored) return { item: null, fromDate: "", toDate: "" };
        return readParams(new URLSearchParams(stored));
    } catch {
        return { item: null, fromDate: "", toDate: "" };
    }
}

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

export default function BusinessPerformanceDashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    const initialSelection = getInitialSelection(location.search);

    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(initialSelection.item);
    const [fromDate, setFromDate] = useState<string>(initialSelection.fromDate);
    const [toDate, setToDate] = useState<string>(initialSelection.toDate);
    const [appliedParams, setAppliedParams] = useState<BusinessPerformanceParams | null>(() => {
        if (!initialSelection.item || !initialSelection.fromDate || !initialSelection.toDate) return null;
        return { headingId: initialSelection.item, fromDate: initialSelection.fromDate, toDate: initialSelection.toDate };
    });

    useEffect(() => {
        if (location.search || !appliedParams) return;
        const search = new URLSearchParams({
            item: String(appliedParams.headingId),
            fromDate: appliedParams.fromDate,
            toDate: appliedParams.toDate,
        });
        navigate({ search: `?${search.toString()}` }, { replace: true });
    }, [appliedParams, location.search, navigate]);

    const { data: headings = [] } = useItemHeadings();
    const { data, isLoading: dataLoading } = useBusinessPerformance(appliedParams);

    const dateError = fromDate && toDate && fromDate > toDate ? "From Date must be on or before To Date" : null;

    const params = useMemo<BusinessPerformanceParams | null>(() => {
        if (!selectedHeadingId || !fromDate || !toDate || dateError) return null;
        return { headingId: selectedHeadingId, fromDate, toDate };
    }, [dateError, fromDate, selectedHeadingId, toDate]);

    const handleSubmit = () => {
        if (!params) return;
        setAppliedParams(params);

        const search = new URLSearchParams({ item: String(params.headingId), fromDate: params.fromDate, toDate: params.toDate });
        localStorage.setItem(persistedSelectionKey, search.toString());
        navigate({ search: `?${search.toString()}` }, { replace: true });
    };

    const handleExportReport = useCallback(() => {
        if (!data || !appliedParams) return;

        const selectedHeading = headings.find(h => h.id === appliedParams.headingId);
        const headingName = selectedHeading?.name || "Unknown";

        const allData: Record<string, unknown>[] = [];

        Object.entries(data.summary).forEach(([category, summaryData]) => {
            allData.push({ section: "Summary", category: titleCase(category), count: summaryData.count, value: summaryData.value, tenders: summaryData.tender.join(", ") });
        });

        const headers = [
            { key: "section", label: "Section" },
            { key: "category", label: "Category" },
            { key: "count", label: "Count" },
            { key: "value", label: "Value" },
            { key: "tenders", label: "Tenders" },
        ];

        const filename = `Business_Performance_${headingName}_${appliedParams.fromDate}_to_${appliedParams.toDate}`;
        exportToCSV(allData, filename, headers);
    }, [appliedParams, data, headings]);

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
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

                <Card className="shadow-sm">
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Heading</label>
                                <Combobox
                                    value={selectedHeadingId ? selectedHeadingId.toString() : ""}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : null)}
                                    options={[...headings].sort((a, b) => a.name.localeCompare(b.name)).map(heading => ({ id: heading.id.toString(), name: `${heading.name}` }))}
                                    placeholder="Select Item Heading"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">To Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={toDate} onChange={e => setToDate(e.target.value)} />
                                </div>
                            </div>

                            <Button onClick={handleSubmit} disabled={!params} className="justify-self-center">
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </div>
                        {dateError && <p className="mt-2 text-sm text-destructive">{dateError}</p>}
                    </CardContent>
                </Card>

                {!appliedParams ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Please select an Item Heading, From Date and To Date to view the report.</span>
                    </div>
                ) : dataLoading ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Loading...</span>
                    </div>
                ) : (
                    <>
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

                        <div className="space-y-4">
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
