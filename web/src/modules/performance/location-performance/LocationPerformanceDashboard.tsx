import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* UI Components */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* Icons */
import { Filter, Download } from "lucide-react";

/* Custom Hooks */
import { useLocationPerformance, useItemHeadings, buildFinancialYearOptions, yearToDateRange, type LocationPerformanceParams } from "@/hooks/api/useLocationPerformance";
import { useLocationsTrue } from "@/hooks/api/useLocations";
import { useTeams } from "@/hooks/api/useTeams";
import { Combobox } from "@/components/form/SelectField";

/* Components */
import LocationCategoryTable from "./components/LocationCategoryTable";

/* ================================
   HELPERS
=============================== */
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
            year: year ?? undefined,
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
            year: selectedFinancialYear,
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

        // Add tender list data
        data.tenderList?.forEach(tender => {
            allData.push({
                section: "Tender List",
                category: tender.status,
                count: 1,
                value: tender.gstValues,
                tenders: tender.tenderName,
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
                        <div className="grid grid-cols-1 md:grid-cols-5 w-full gap-4 items-end">
                            {/* State */}
                            <div className="space-y-2">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team</label>
                                <Combobox
                                    value={selectedTeam !== null ? String(selectedTeam) : ""}
                                    onChange={v => setSelectedTeam(v ? Number(v) : null)}
                                    options={teams.map(team => ({ id: String(team.id), name: team.name }))}
                                    placeholder="Please Select Team"
                                />
                            </div>

                            {/* Item Heading */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Heading</label>
                                <Combobox
                                    value={selectedHeadingId ? selectedHeadingId.toString() : ""}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : null)}
                                    options={headings.map(heading => ({ id: heading.id.toString(), name: heading.name }))}
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
                            <Button onClick={handleSubmit} disabled={!params} className="justify-self-start md:justify-self-center">
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
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
                        {/* ===== AVERAGE GP CARD ===== */}
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

                        {/* ===== CATEGORY TABLES ===== */}
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_assigned" title="Tenders Assigned" description="All tenders assigned in this period." />
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_approved" title="Tenders Approved" description="Tenders approved by the team lead." />
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_missed" title="Tenders Missed" description="Tenders that were missed for submission." />
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_not_bid" title="Tenders Did Not Bid" description="Tenders assigned but not bid on." />
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_bid" title="Tenders Bid" description="Tenders where a bid has been submitted." />
                        <LocationCategoryTable
                            params={appliedParams}
                            categoryKey="tender_results_awaited"
                            title="Tender Results Awaited"
                            description="Tenders awaiting final results."
                        />
                        <LocationCategoryTable
                            params={appliedParams}
                            categoryKey="tenders_disqualified"
                            title="Tenders Disqualified"
                            description="Tenders that were disqualified."
                        />
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_won" title="Tenders Won" description="Tenders that were won." />
                        <LocationCategoryTable params={appliedParams} categoryKey="tenders_lost" title="Tenders Lost" description="Tenders that were lost." />
                        <LocationCategoryTable params={appliedParams} categoryKey="emd_paid" title="EMD Paid" description="Tenders where the EMD has been paid." />
                        <LocationCategoryTable params={appliedParams} categoryKey="emd_returned" title="EMD Returned" description="Tenders where the EMD has been returned." />
                    </>
                )}
            </div>
        </div>
    );
}
