import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* UI Components */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* Icons */
import { Filter, Download, Calendar as CalendarIcon } from "lucide-react";

/* Custom Hooks */
import { useLocationPerformance, useItemHeadings, type LocationPerformanceParams } from "@/hooks/api/useLocationPerformance";
import { useStates, useRegions } from "@/hooks/api/useLocations";
import { useTeams } from "@/hooks/api/useTeams";
import { Combobox } from "@/components/form/SelectField";

/* Components */
import LocationTenderTable from "./components/LocationTenderTable";
import LocationBarChart from "./components/LocationBarChart";
import LocationDonutChart from "./components/LocationDonutChart";

/* Helpers */
import { LOCATION_TABS, DEFAULT_LOCATION_TAB } from "./helpers/location-tabs";

/* ================================
   HELPERS
=============================== */
const LOCATION_PERFORMANCE_STORAGE_KEY = "location-performance-filters";

type LocationPerformanceFilters = {
    selectedHeadingId: number;
    selectedState: string | null;
    selectedRegion: string | null;
    selectedTeam: number;
    fromDate: string;
    toDate: string;
    tab: string;
};

const isValidDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseNumber = (value: string | null, fallback: number): number => {
    if (value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const VALID_TAB_KEYS: ReadonlySet<string> = new Set<string>(LOCATION_TABS.map(t => t.key));

const getInitialFilters = (search: string): LocationPerformanceFilters => {
    const urlParams = new URLSearchParams(search);
    const hasUrlFilters = ["item", "state", "region", "team", "fromDate", "toDate", "year", "tab"].some(key => urlParams.has(key));
    const source = hasUrlFilters ? urlParams : new URLSearchParams(localStorage.getItem(LOCATION_PERFORMANCE_STORAGE_KEY) ?? "");

    let fromDate = source.get("fromDate") ?? "";
    let toDate = source.get("toDate") ?? "";
    const legacyYear = source.get("year");

    if ((!isValidDate(fromDate) || !isValidDate(toDate)) && legacyYear) {
        const match = /^(\d{4})-(\d{2})$/.exec(legacyYear);
        if (match) {
            fromDate = `${match[1]}-04-01`;
            toDate = `${2000 + Number(match[2])}-03-31`;
        }
    }

    const validRange = isValidDate(fromDate) && isValidDate(toDate) && fromDate <= toDate;

    const rawTab = source.get("tab");

    return {
        selectedHeadingId: parseNumber(source.get("item"), 0),
        selectedState: source.get("state") || null,
        selectedRegion: source.get("region") || null,
        selectedTeam: parseNumber(source.get("team"), 0),
        fromDate: validRange ? fromDate : "",
        toDate: validRange ? toDate : "",
        tab: rawTab && VALID_TAB_KEYS.has(rawTab) ? rawTab : DEFAULT_LOCATION_TAB,
    };
};

const toAppliedParams = (filters: LocationPerformanceFilters): LocationPerformanceParams | null => {
    // Require state, plus dates
    if (!filters.selectedState || !filters.fromDate || !filters.toDate) return null;
    return {
        headingId: filters.selectedHeadingId > 0 ? filters.selectedHeadingId : undefined,
        state: filters.selectedState,
        region: filters.selectedRegion ?? undefined,
        team: filters.selectedTeam > 0 ? filters.selectedTeam : undefined,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        tab: filters.tab,
    };
};

const buildSearchFromParams = (params: LocationPerformanceParams): URLSearchParams => {
    const search = new URLSearchParams();
    if (params.headingId) search.set("item", String(params.headingId));
    if (params.state) search.set("state", params.state);
    if (params.region) search.set("region", params.region);
    if (params.team) search.set("team", String(params.team));
    if (params.tab) search.set("tab", params.tab);
    search.set("fromDate", params.fromDate);
    search.set("toDate", params.toDate);
    return search;
};

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

    const initialFilters = getInitialFilters(location.search);

    // Filter States (initialized from URL params for shareable/bookmarkable links)
    const [selectedHeadingId, setSelectedHeadingId] = useState(initialFilters.selectedHeadingId);
    const [selectedState, setSelectedState] = useState<string | null>(initialFilters.selectedState);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(initialFilters.selectedRegion);
    const [selectedTeam, setSelectedTeam] = useState(initialFilters.selectedTeam);
    const [fromDate, setFromDate] = useState(initialFilters.fromDate);
    const [toDate, setToDate] = useState(initialFilters.toDate);
    const [appliedParams, setAppliedParams] = useState<LocationPerformanceParams | null>(() => toAppliedParams(initialFilters));

    useEffect(() => {
        if (location.search || !appliedParams) return;
        const search = buildSearchFromParams(appliedParams);
        navigate({ search: `?${search.toString()}` }, { replace: true });
    }, [appliedParams, location.search, navigate]);

    // Fetch filter dropdown data
    const { data: headings = [] } = useItemHeadings();
    const { data: states = [] } = useStates();
    const { data: regions = [] } = useRegions(selectedState ?? undefined);
    const { data: teams = [] } = useTeams();

    // Fetch location performance data
    const { data, isLoading: dataLoading } = useLocationPerformance(appliedParams);

    // Tab counts — how many tenders fall into each category
    const tabCounts = useMemo(() => {
        if (!data?.tenderList) return {} as Record<string, number>;
        const counts: Record<string, number> = {};
        LOCATION_TABS.forEach(tab => {
            counts[tab.key] = data.tenderList.filter(t => t.category.includes(tab.key)).length;
        });
        return counts;
    }, [data]);

    const dateError = fromDate && toDate && fromDate > toDate ? "From Date must be on or before To Date" : null;

    // Build params for submission
    const params = useMemo<LocationPerformanceParams | null>(() => {
        if (!selectedState || !fromDate || !toDate || dateError) return null;
        return {
            headingId: selectedHeadingId > 0 ? selectedHeadingId : undefined,
            state: selectedState,
            region: selectedRegion ?? undefined,
            team: selectedTeam > 0 ? selectedTeam : undefined,
            fromDate,
            toDate,
            tab: appliedParams?.tab ?? DEFAULT_LOCATION_TAB,
        };
    }, [dateError, fromDate, toDate, selectedHeadingId, selectedState, selectedRegion, selectedTeam, appliedParams?.tab]);

    // Handle State change — clear dependent Region
    const handleStateChange = (value: string | null) => {
        setSelectedState(value);
        setSelectedRegion(null);
    };

    // Handle Region change
    const handleRegionChange = (value: string | null) => {
        setSelectedRegion(value);
    };

    // Handle Tab change — UI-only, keep applied params in sync for URL
    const handleTabChange = (value: string) => {
        const next = appliedParams ? { ...appliedParams, tab: value } : null;
        if (next) {
            setAppliedParams(next);
            const search = buildSearchFromParams(next);
            try {
                localStorage.setItem(LOCATION_PERFORMANCE_STORAGE_KEY, search.toString());
            } catch (error) {
                void error;
            }
            navigate({ search: `?${search.toString()}` }, { replace: true });
        }
    };

    // Handle form submission
    const handleSubmit = () => {
        if (!params) return;
        setAppliedParams(params);

        const search = buildSearchFromParams(params);

        try {
            localStorage.setItem(LOCATION_PERFORMANCE_STORAGE_KEY, search.toString());
        } catch (error) {
            void error;
        }

        navigate({ search: `?${search.toString()}` }, { replace: true });
    };

    // Export handler
    const handleExportReport = useCallback(() => {
        if (!data) return;

        const selectedHeading = headings.find(h => h.id === selectedHeadingId);
        const headingName = selectedHeading?.name ?? (selectedHeadingId > 0 ? "Unknown" : "All");

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

        const filename = `Location_Performance_${headingName}_${appliedParams?.fromDate ?? ""}_to_${appliedParams?.toDate ?? ""}`;
        exportToCSV(allData, filename, headers);
    }, [appliedParams, data, headings, selectedHeadingId]);

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Location Performance</h1>
                        <p className="text-muted-foreground mt-1">Analyze location performance metrics by state, region, item heading, team and date range.</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full gap-4 items-end">
                            {/* State */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">State</label>
                                <Combobox
                                    value={selectedState ?? ""}
                                    onChange={handleStateChange}
                                    options={states.map(state => ({
                                        id: state,
                                        name: state.charAt(0).toUpperCase() + state.slice(1).toLowerCase(),
                                    }))}
                                    placeholder="Select State"
                                />
                            </div>

                            {/* Region */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Region</label>
                                <Combobox
                                    value={selectedRegion ?? ""}
                                    onChange={handleRegionChange}
                                    options={regions.map(region => ({
                                        id: region,
                                        name: region.charAt(0).toUpperCase() + region.slice(1).toLowerCase(),
                                    }))}
                                    placeholder="Select Region"
                                />
                            </div>

                            {/* Team */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team</label>
                                <Combobox
                                    value={String(selectedTeam)}
                                    onChange={v => setSelectedTeam(v ? Number(v) : 0)}
                                    options={[
                                        { id: "0", name: "All" },
                                        ...teams
                                            .filter(team => team.id === 1 || team.id === 2)
                                            .sort((a, b) => a.id - b.id)
                                            .map(team => ({ id: String(team.id), name: team.name })),
                                    ]}
                                    placeholder="Select Team"
                                />
                            </div>

                            {/* Item Heading */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Heading</label>
                                <Combobox
                                    value={String(selectedHeadingId)}
                                    onChange={v => setSelectedHeadingId(v ? Number(v) : 0)}
                                    options={[
                                        { id: "0", name: "All" },
                                        ...[...headings].sort((a, b) => a.name.localeCompare(b.name)).map(heading => ({ id: String(heading.id), name: heading.name })),
                                    ]}
                                    placeholder="Select Item Heading"
                                />
                            </div>

                            {/* From Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                                </div>
                            </div>

                            {/* To Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">To Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={toDate} onChange={e => setToDate(e.target.value)} />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button onClick={handleSubmit} disabled={!params} className="justify-self-start md:justify-self-center">
                                <Filter className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </div>
                        {dateError && <p className="mt-2 text-sm text-destructive">{dateError}</p>}
                    </CardContent>
                </Card>

                {/* ===== CONDITIONAL CONTENT ===== */}
                {!appliedParams ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Please select a State, From Date and To Date to view the report.</span>
                    </div>
                ) : dataLoading ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                        <span className="text-muted-foreground">Loading...</span>
                    </div>
                ) : (
                    <>
                        {/* ===== CATEGORY TABS + TABLE ===== */}
                        <Card className="shadow-sm">
                            <CardContent className="space-y-6 p-6">
                                <Tabs value={appliedParams.tab ?? DEFAULT_LOCATION_TAB} onValueChange={handleTabChange}>
                                    <TabsList className="m-auto mb-4">
                                        {LOCATION_TABS.map(tab => (
                                            <TabsTrigger key={tab.key} value={tab.key} className="data-[state=active]:shadow-md flex items-center gap-1 px-1.5">
                                                <span className="font-semibold text-xs whitespace-nowrap">{tab.label}</span>
                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                                    {tabCounts[tab.key] ?? 0}
                                                </Badge>
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>

                                <LocationTenderTable params={appliedParams} tab={appliedParams.tab ?? DEFAULT_LOCATION_TAB} data={data} isLoading={dataLoading} />
                            </CardContent>
                        </Card>

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

                        {/* ===== CHARTS ===== */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <LocationBarChart params={appliedParams} />
                            <LocationDonutChart params={appliedParams} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
