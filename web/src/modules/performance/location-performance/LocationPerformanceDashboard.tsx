import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Icons */
import { Filter, Download, MapPin, Building2, Package } from "lucide-react";

/* Custom Hooks */
import { useLocationPerformance, useItemHeadings, buildFinancialYearOptions, yearToDateRange, type LocationPerformanceParams } from "@/hooks/api/useLocationPerformance";
import { useLocationsTrue } from "@/hooks/api/useLocations";
import { useTeams } from "@/hooks/api/useTeams";
import { Combobox } from "@/components/form/SelectField";

/* ================================
   HELPERS
================================ */
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
================================ */
export default function LocationPerformanceDashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    // Filter States (initialized from URL params for shareable/bookmarkable links)
    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("item");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [selectedLocation, setSelectedLocation] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("location");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [selectedTeam, setSelectedTeam] = useState<number | null>(() => {
        const raw = new URLSearchParams(location.search).get("team");
        const parsed = raw !== null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(() => {
        return new URLSearchParams(location.search).get("year") ?? "";
    });
    const [appliedParams, setAppliedParams] = useState<LocationPerformanceParams | null>(() => {
        const search = new URLSearchParams(location.search);
        const rawHeading = search.get("item");
        const headingId = rawHeading !== null ? Number(rawHeading) : NaN;
        const rawLocation = search.get("location");
        const loc = rawLocation !== null ? Number(rawLocation) : NaN;
        const rawTeam = search.get("team");
        const team = rawTeam !== null ? Number(rawTeam) : NaN;
        const year = search.get("year");
        const range = yearToDateRange(year);
        if (!range || !Number.isFinite(headingId) || !Number.isFinite(loc)) return null;
        return {
            headingId,
            location: loc,
            team: Number.isFinite(team) ? team : undefined,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    });

    // Fetch headings for dropdown
    const { data: headings = [] } = useItemHeadings();

    // Fetch location performance data
    const { data, isLoading: dataLoading } = useLocationPerformance(appliedParams);

    const { data: locations = [] } = useLocationsTrue();

    const { data: teams = [] } = useTeams();

    // Financial Year dropdown options
    const financialYearOptions = useMemo(() => buildFinancialYearOptions(), []);

    // Build params for submission
    const params = useMemo(() => {
        if (!selectedHeadingId || !selectedLocation) return null;
        const range = yearToDateRange(selectedFinancialYear);
        if (!range) return null;
        return {
            headingId: selectedHeadingId,
            location: selectedLocation,
            team: selectedTeam || undefined,
            fromDate: range.fromDate,
            toDate: range.toDate,
        };
    }, [selectedHeadingId, selectedLocation, selectedTeam, selectedFinancialYear]);

    // Handle form submission
    const handleSubmit = () => {
        if (!params) return;
        setAppliedParams(params);

        const search = new URLSearchParams();
        search.set("item", String(params.headingId));
        search.set("location", String(params.location));
        if (params.team) search.set("team", String(params.team));
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

        // Add region data
        Object.entries(data.metrics.by_region).forEach(([region, metricData]) => {
            allData.push({
                section: "Region Analysis",
                category: region,
                count: metricData.count,
                value: metricData.value,
                tenders: "",
            });
        });

        // Add state data
        Object.entries(data.metrics.by_state).forEach(([state, metricData]) => {
            allData.push({
                section: "State Analysis",
                category: state,
                count: metricData.count,
                value: metricData.value,
                tenders: "",
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

        const filename = `Location_Performance_${headingName}_${selectedFinancialYear}`;
        exportToCSV(allData, filename, headers);
    }, [data, headings, selectedHeadingId, selectedFinancialYear]);

    // Extract summary entries for rendering
    const summaryEntries = data ? Object.entries(data.summary) : [];

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Location Performance</h1>
                        <p className="text-muted-foreground mt-1">Analyze location performance metrics by item heading, state, team and financial year.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExportReport} disabled={!appliedParams || !data}>
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                {/* ===== FILTER CARD ===== */}
                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-wrap gap-3 justify-center items-center w-full">
                            {/* State */}
                            <div>
                                <label className="text-sm font-medium">State</label>
                                <Combobox
                                    value={selectedLocation !== null ? String(selectedLocation) : ""}
                                    onChange={v => setSelectedLocation(v ? Number(v) : null)}
                                    options={locations.map(location => ({
                                        id: location.id.toString(),
                                        name: location.name.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()),
                                    }))}
                                    placeholder="Please Select Location"
                                />
                            </div>

                            {/* Team */}
                            <div>
                                <label className="text-sm font-medium">Team</label>
                                <Combobox
                                    value={selectedTeam !== null ? String(selectedTeam) : ""}
                                    onChange={v => setSelectedTeam(v ? Number(v) : null)}
                                    options={teams.map(team => ({ id: String(team.id), name: team.name }))}
                                    placeholder="Please Select Team"
                                />
                            </div>

                            {/* Item Heading */}
                            <div>
                                <label className="text-sm font-medium">Item Heading</label>
                                <Combobox
                                    value={selectedHeadingId ? selectedHeadingId.toString() : ""}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : null)}
                                    options={headings.map(heading => ({ id: heading.id.toString(), name: heading.name }))}
                                    placeholder="Select Item Heading"
                                />
                            </div>

                            {/* Financial Year + Submit */}
                            <div className="flex items-end gap-2">
                                <Combobox
                                    value={selectedFinancialYear}
                                    onChange={v => setSelectedFinancialYear(v)}
                                    options={financialYearOptions}
                                    placeholder="Select Financial Year"
                                />
                                <Button onClick={handleSubmit} disabled={!params}>
                                    <Filter className="mr-2 h-4 w-4" /> Submit
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== CONDITIONAL CONTENT ===== */}
                {!appliedParams ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Please select a State, Team, Item Heading and Financial Year to view the report.</span>
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
                                            {/* <TrendingUp className="h-5 w-5 text-primary" /> */}
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

                        {/* ===== METRICS TABLES (3 columns) ===== */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Region-wise Analysis */}
                            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                        Region-wise Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="font-semibold">Region</TableHead>
                                                    <TableHead className="font-semibold">Count</TableHead>
                                                    <TableHead className="font-semibold">Value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.metrics?.by_region && Object.entries(data.metrics.by_region).length > 0 ? (
                                                    Object.entries(data.metrics.by_region).map(([region, metricData]) => (
                                                        <TableRow key={region} className="hover:bg-muted/30 transition-colors">
                                                            <TableCell className="font-medium">{region}</TableCell>
                                                            <TableCell className="tabular-nums">{metricData.count}</TableCell>
                                                            <TableCell className="tabular-nums">{formatCurrency(metricData.value)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                            No region data available.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* State-wise Analysis */}
                            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-green-600" />
                                        State-wise Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="font-semibold">State</TableHead>
                                                    <TableHead className="font-semibold">Count</TableHead>
                                                    <TableHead className="font-semibold">Value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.metrics?.by_state && Object.entries(data.metrics.by_state).length > 0 ? (
                                                    Object.entries(data.metrics.by_state).map(([state, metricData]) => (
                                                        <TableRow key={state} className="hover:bg-muted/30 transition-colors">
                                                            <TableCell className="font-medium">{state}</TableCell>
                                                            <TableCell className="tabular-nums">{metricData.count}</TableCell>
                                                            <TableCell className="tabular-nums">{formatCurrency(metricData.value)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                            No state data available.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Item-wise Analysis */}
                            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Package className="h-5 w-5 text-purple-600" />
                                        Item-wise Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="font-semibold">Item</TableHead>
                                                    <TableHead className="font-semibold">Count</TableHead>
                                                    <TableHead className="font-semibold">Value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data?.metrics?.by_item && Object.entries(data.metrics.by_item).length > 0 ? (
                                                    Object.entries(data.metrics.by_item).map(([item, metricData]) => (
                                                        <TableRow key={item} className="hover:bg-muted/30 transition-colors">
                                                            <TableCell className="font-medium">{item}</TableCell>
                                                            <TableCell className="tabular-nums">{metricData.count}</TableCell>
                                                            <TableCell className="tabular-nums">{formatCurrency(metricData.value)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                            No item data available.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
