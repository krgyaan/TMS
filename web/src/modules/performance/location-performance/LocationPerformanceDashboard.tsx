import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Not using tabs here
// import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Not using avatars here

/* Icons */
import {
    Filter,
    Download,
    Calendar as CalendarIcon,
    Search,
    Trophy,
    XCircle,
    FileText,
    TrendingUp,
    Briefcase,
    Eye,
    DollarSign, // For Value
    Percent, // For Percentage metrics
    Target, // For Scoring
    Globe, // For Region/Area
    MapPin, // For State
    Landmark, // For City breakdown
    LayoutGrid, // For item heading breakdown
    Users, // For team type breakdown
    PieChartIcon, // For distribution chart
    Scale, // For market share
} from "lucide-react";

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: number) => {
    if (typeof amount !== "number" || isNaN(amount)) {
        return "₹0";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatPercentage = (value: number) => {
    return `${value.toFixed(0)}%`;
};

// Colors for status badges
const STATUS_COLOR_MAP: Record<string, "default" | "destructive" | "secondary" | "warning" | "success" | "blue" | "indigo" | "purple"> = {
    Won: "default", // primary like
    Lost: "destructive",
    Submitted: "secondary",
    Negotiation: "warning",
    Pending: "warning",
    "Not Bid": "secondary",
};

/* ================================
   DUMMY DATA INTERFACES
================================ */
interface LocationFilterData {
    id: string; // Unique ID for state/region (e.g., "Maharashtra", "North")
    name: string;
}

interface ItemHeading {
    id: number;
    name: string;
}

interface LocationSummary {
    totalTenders: number;
    tendersWon: number;
    tendersLost: number;
    tendersSubmitted: number;
    tendersNegotiation: number;
    totalValue: number;
    totalValueWon: number;
    totalValueLost: number;
    winRate: number; // percentage
    avgDealValue: number;
    marketPenetration: number; // dummy percentage
}

interface LocationTender {
    id: string;
    tenderNo: string;
    tenderName: string;
    organizationName: string;
    value: number;
    status: "Won" | "Lost" | "Submitted" | "Negotiation" | "Pending";
    state: string;
    region: string; // "Area" in your blade file
    city: string; // More granular location
    itemHeadingId: number;
    itemHeadingName: string;
    teamType: "AC" | "DC";
    tenderExecutive: string;
    submissionDate: string; // "YYYY-MM-DD"
}

interface KPICard {
    key: string;
    label: string;
    count: number | string; // Can be count or percentage string
    value?: number; // Monetary value
    icon: any; // Lucide icon component
    color: string;
    bg: string;
}

interface TrendData {
    label: string; // e.g., 'Jan', 'Feb'
    winRate: number; // percentage
    totalValueWon: number; // monetary value
}

interface BreakdownMetric {
    name: string; // City, Item Heading name, or Team Type
    count: number;
    value: number;
}

interface LocationScoring {
    revenueImpact: number;
    winRateEfficiency: number;
    marketCoverage: number;
    total: number;
}

type LocationScoringKey = "Revenue Impact" | "Win Rate Efficiency" | "Market Coverage";

/* ================================
   DUMMY DATA GENERATION
================================ */

const dummyStates: LocationFilterData[] = [
    { id: "MH", name: "Maharashtra" },
    { id: "DL", name: "Delhi" },
    { id: "KA", name: "Karnataka" },
    { id: "UP", name: "Uttar Pradesh" },
    { id: "RJ", name: "Rajasthan" },
];
const dummyRegions: LocationFilterData[] = [
    { id: "North", name: "North" },
    { id: "West", name: "West" },
    { id: "South", name: "South" },
    { id: "East", name: "East" },
    { id: "Central", name: "Central" },
];
const dummyCities: { [stateId: string]: string[] } = {
    MH: ["Mumbai", "Pune", "Nagpur"],
    DL: ["Delhi", "Gurgaon"],
    KA: ["Bengaluru", "Mysuru"],
    UP: ["Lucknow", "Noida"],
    RJ: ["Jaipur", "Udaipur"],
};
const dummyItemHeadings: ItemHeading[] = [
    { id: 101, name: "Software Services" },
    { id: 102, name: "Infrastructure" },
    { id: 103, name: "Consulting" },
    { id: 104, name: "Hardware" },
];
const dummyTeamTypes = ["AC", "DC"];

const getStateRegion = (stateId: string): string => {
    if (stateId === "DL" || stateId === "UP" || stateId === "RJ") return "North";
    if (stateId === "MH") return "West";
    if (stateId === "KA") return "South";
    return "Central"; // Default
};

const generateDummyLocationSummary = (
    stateId: string | null,
    regionId: string | null,
    teamType: string | null,
    itemHeadingId: number | null,
    fromDate: string | null,
    toDate: string | null
): LocationSummary => {
    let base = 200;
    if (stateId) base += 50;
    else if (regionId) base += 30;

    const rand = () => Math.floor(Math.random() * 25);
    const dateFactor = fromDate && toDate ? 1.2 : 1;
    const teamFactor = teamType === "AC" ? 1.1 : teamType === "DC" ? 0.9 : 1;
    const itemFactor = itemHeadingId ? (itemHeadingId % 2 === 0 ? 1.05 : 0.95) : 1;

    const tendersWon = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.3);
    const tendersLost = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.2);
    const tendersSubmitted = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.4);
    const tendersNegotiation = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.1);

    const totalTenders = tendersWon + tendersLost + tendersSubmitted + tendersNegotiation + Math.floor(rand() / 3);

    const totalValueWon = tendersWon * (900000 + rand() * 200000) * dateFactor * teamFactor;
    const totalValueLost = tendersLost * (400000 + rand() * 100000) * dateFactor * teamFactor;
    const totalValueSubmitted = tendersSubmitted * (700000 + rand() * 150000) * dateFactor * teamFactor;

    const totalValue = totalValueWon + totalValueLost + totalValueSubmitted;

    const winRate = tendersWon + tendersLost > 0 ? Math.round((tendersWon / (tendersWon + tendersLost)) * 100) : 0;
    const avgDealValue = totalTenders > 0 ? Math.round(totalValue / totalTenders) : 0;
    const marketPenetration = Math.min(100, Math.round(50 + rand() * 2 + (stateId ? 10 : regionId ? 5 : 0)));

    return {
        totalTenders,
        tendersWon,
        tendersLost,
        tendersSubmitted,
        tendersNegotiation,
        totalValue,
        totalValueWon,
        totalValueLost,
        winRate,
        avgDealValue,
        marketPenetration,
    };
};

const generateDummyLocationTenders = (
    stateId: string | null,
    regionId: string | null,
    teamType: string | null,
    itemHeadingId: number | null,
    selectedMetric: string,
    fromDate: string | null,
    toDate: string | null
): LocationTender[] => {
    const tenders: LocationTender[] = [];
    const baseCount = 100;

    for (let i = 0; i < baseCount; i++) {
        const statusRand = Math.random();
        let status: LocationTender["status"];
        if (statusRand < 0.35) status = "Won";
        else if (statusRand < 0.55) status = "Lost";
        else if (statusRand < 0.75) status = "Submitted";
        else if (statusRand < 0.9) status = "Negotiation";
        else status = "Pending";

        const tenderNo = `LOC-TEN-${Math.floor(Math.random() * 100000)}`;
        const organizationName = `Org ${Math.floor(Math.random() * 8) + 1}`;
        const tenderName = `Location Project ${Math.floor(Math.random() * 200)} - Phase ${(i % 7) + 1}`;
        const value = Math.floor(Math.random() * 12000000) + 700000;

        const randomState = dummyStates[Math.floor(Math.random() * dummyStates.length)];
        const randomRegion = getStateRegion(randomState.id);
        const randomCity = dummyCities[randomState.id][Math.floor(Math.random() * dummyCities[randomState.id].length)];

        const randomItemHeading = dummyItemHeadings[Math.floor(Math.random() * dummyItemHeadings.length)];
        const randomTeamType = dummyTeamTypes[Math.floor(Math.random() * dummyTeamTypes.length)];
        const submissionDate = `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`;

        tenders.push({
            id: `loc-task-${i}`,
            tenderNo,
            tenderName,
            organizationName,
            value,
            status,
            state: randomState.name,
            region: randomRegion,
            city: randomCity,
            itemHeadingId: randomItemHeading.id,
            itemHeadingName: randomItemHeading.name,
            teamType: randomTeamType as "AC" | "DC",
            tenderExecutive: `Exec ${Math.floor(Math.random() * 15) + 1}`,
            submissionDate,
        });
    }

    return tenders.filter(t => {
        let matchesFilters = true;
        if (stateId && t.state !== dummyStates.find(s => s.id === stateId)?.name) matchesFilters = false;
        if (regionId && t.region !== dummyRegions.find(r => r.id === regionId)?.name) matchesFilters = false;
        if (teamType && t.teamType !== teamType) matchesFilters = false;
        if (itemHeadingId && t.itemHeadingId !== itemHeadingId) matchesFilters = false;
        // Date filtering (simplified for dummy)
        // if (fromDate && new Date(t.submissionDate) < new Date(fromDate)) matchesFilters = false;
        // if (toDate && new Date(t.submissionDate) > new Date(toDate)) matchesFilters = false;

        if (!matchesFilters) return false;

        if (selectedMetric === "total") return true;
        if (selectedMetric === "tendersWon") return t.status === "Won";
        if (selectedMetric === "tendersLost") return t.status === "Lost";
        if (selectedMetric === "tendersSubmitted") return t.status === "Submitted";
        if (selectedMetric === "tendersNegotiation") return t.status === "Negotiation";
        return true;
    });
};

const generateDummyLocationTrends = (stateId: string | null, regionId: string | null): TrendData[] => {
    return Array.from({ length: 6 }).map((_, i) => ({
        label: `M-${i + 1}`, // Month 1, 2, ...
        winRate: 30 + Math.floor(Math.random() * 40) + (stateId ? 10 : regionId ? 5 : 0),
        totalValueWon: (6000000 + Math.floor(Math.random() * 10000000)) * (stateId ? 1.2 : regionId ? 1.1 : 1),
    }));
};

const generateDummyBreakdownData = (data: LocationTender[], type: "city" | "itemHeading" | "teamType" | "state"): BreakdownMetric[] => {
    const breakdownMap: { [key: string]: { count: number; value: number } } = {};

    data.forEach(tender => {
        let key: string;
        if (type === "city") key = tender.city;
        else if (type === "itemHeading") key = tender.itemHeadingName;
        else if (type === "teamType") key = tender.teamType;
        else key = tender.state;

        if (!breakdownMap[key]) {
            breakdownMap[key] = { count: 0, value: 0 };
        }
        breakdownMap[key].count++;
        breakdownMap[key].value += tender.value;
    });

    return Object.keys(breakdownMap)
        .map(key => ({
            name: key,
            count: breakdownMap[key].count,
            value: breakdownMap[key].value,
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending
};

const generateDummyLocationScoring = (summary: LocationSummary): LocationScoring => {
    const revenueImpact = Math.min(100, Math.round((summary.totalValueWon / 30000000) * 60 + Math.random() * 20));
    const winRateEfficiency = Math.min(100, Math.round(summary.winRate * 0.9 + (summary.avgDealValue / 1000000) * 10)); // Avg deal value influences efficiency
    const marketCoverage = Math.min(100, Math.round(summary.marketPenetration * 0.8 + Math.random() * 20));
    const total = Math.round(revenueImpact * 0.4 + winRateEfficiency * 0.3 + marketCoverage * 0.3);
    return { revenueImpact, winRateEfficiency, marketCoverage, total };
};

/* ================================
   MAIN PAGE COMPONENT
================================ */

export default function LocationPerformanceDashboard() {
    const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null); // "Area" in blade
    const [selectedTeamType, setSelectedTeamType] = useState<string | null>(null);
    const [selectedItemHeadingId, setSelectedItemHeadingId] = useState<number | null>(null);
    const [fromDate, setFromDate] = useState<string | null>(null);
    const [toDate, setToDate] = useState<string | null>(null);
    const [selectedMetric, setSelectedMetric] = useState("total"); // For KPI cards and filtering the tender list

    // Use dummy data for filters
    const states = dummyStates;
    const regions = dummyRegions;
    const itemHeadings = dummyItemHeadings;

    // Generate dummy data based on filters
    const summary = useMemo(
        () => generateDummyLocationSummary(selectedStateId, selectedRegionId, selectedTeamType, selectedItemHeadingId, fromDate, toDate),
        [selectedStateId, selectedRegionId, selectedTeamType, selectedItemHeadingId, fromDate, toDate]
    );
    const locationTenders = useMemo(
        () => generateDummyLocationTenders(selectedStateId, selectedRegionId, selectedTeamType, selectedItemHeadingId, selectedMetric, fromDate, toDate),
        [selectedStateId, selectedRegionId, selectedTeamType, selectedItemHeadingId, selectedMetric, fromDate, toDate]
    );
    const locationTrends = useMemo(() => generateDummyLocationTrends(selectedStateId, selectedRegionId), [selectedStateId, selectedRegionId]);
    const locationScoring = useMemo(() => generateDummyLocationScoring(summary), [summary]);

    // Breakdown metrics
    const geographicalBreakdown = useMemo(() => {
        if (selectedStateId) {
            return generateDummyBreakdownData(locationTenders, "city");
        } else if (selectedRegionId) {
            return generateDummyBreakdownData(locationTenders, "state");
        }
        return generateDummyBreakdownData(locationTenders, "state"); // Default to state breakdown
    }, [locationTenders, selectedStateId, selectedRegionId]);

    const itemHeadingBreakdown = useMemo(() => generateDummyBreakdownData(locationTenders, "itemHeading"), [locationTenders]);
    const teamTypeBreakdown = useMemo(() => generateDummyBreakdownData(locationTenders, "teamType"), [locationTenders]);

    // KPI Card Data for Location Performance
    const KPI_DATA = useMemo((): KPICard[] => {
        return [
            {
                key: "total",
                label: "Total Tenders",
                count: summary.totalTenders,
                value: summary.totalValue,
                icon: Briefcase,
                color: "text-blue-600",
                bg: "bg-blue-50",
            },
            {
                key: "tendersWon",
                label: "Tenders Won",
                count: summary.tendersWon,
                value: summary.totalValueWon,
                icon: Trophy,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
            {
                key: "tendersLost",
                label: "Tenders Lost",
                count: summary.tendersLost,
                value: summary.totalValueLost,
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-50",
            },
            {
                key: "tendersSubmitted",
                label: "Tenders Submitted",
                count: summary.tendersSubmitted,
                icon: FileText,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
            },
            {
                key: "winRate",
                label: "Win Rate",
                count: formatPercentage(summary.winRate),
                icon: Percent,
                color: "text-green-600",
                bg: "bg-green-50",
            },
            {
                key: "avgDealValue",
                label: "Avg Deal Value",
                count: formatCurrency(summary.avgDealValue),
                icon: DollarSign,
                color: "text-amber-600",
                bg: "bg-amber-50",
            },
            {
                key: "marketPenetration",
                label: "Market Penetration",
                count: formatPercentage(summary.marketPenetration),
                icon: Scale,
                color: "text-purple-600",
                bg: "bg-purple-50",
            },
        ];
    }, [summary]);

    const SCORING_COLORS: Record<LocationScoringKey, string> = {
        "Revenue Impact": "#82CA9D", // Green
        "Win Rate Efficiency": "#8884D8", // Purple
        "Market Coverage": "#FFC658", // Yellow
    };

    const SCORING_DATA = locationScoring
        ? [
              { name: "Revenue Impact", score: locationScoring.revenueImpact },
              { name: "Win Rate Efficiency", score: locationScoring.winRateEfficiency },
              { name: "Market Coverage", score: locationScoring.marketCoverage },
          ].map(item => ({
              ...item,
              fill: SCORING_COLORS[item.name as LocationScoringKey],
          }))
        : [];

    const totalScore = locationScoring?.total ?? (SCORING_DATA.length ? Math.round(SCORING_DATA.reduce((sum, item) => sum + item.score, 0) / SCORING_DATA.length) : 0);

    const TENDER_OUTCOME_DATA = [
        { name: "Won", count: summary.tendersWon, fill: "#10B981" }, // emerald-500
        { name: "Lost", count: summary.tendersLost, fill: "#EF4444" }, // red-500
        { name: "Submitted", count: summary.tendersSubmitted, fill: "#6366F1" }, // indigo-500
        { name: "Negotiation", count: summary.tendersNegotiation, fill: "#F59E0B" }, // amber-500
    ].filter(item => item.count > 0); // Only show outcomes with count > 0

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER & FILTERS ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Location Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze business performance segmented by geographical locations.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">State</label>
                                <Select value={selectedStateId} onValueChange={v => setSelectedStateId(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {states?.map(state => (
                                            <SelectItem key={state.id} value={state.id}>
                                                {state.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Area (Region)</label>
                                <Select value={selectedRegionId} onValueChange={v => setSelectedRegionId(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Area" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions?.map(region => (
                                            <SelectItem key={region.id} value={region.id}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team Type</label>
                                <Select value={selectedTeamType} onValueChange={v => setSelectedTeamType(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Team Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AC">AC</SelectItem>
                                        <SelectItem value="DC">DC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Heading</label>
                                <Select value={selectedItemHeadingId?.toString()} onValueChange={v => setSelectedItemHeadingId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Item Heading" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {itemHeadings?.map(heading => (
                                            <SelectItem key={heading.id} value={heading.id.toString()}>
                                                {heading.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                            <div className="md:col-span-6 flex justify-end">
                                <Button className="w-full md:w-auto">
                                    <Filter className="mr-2 h-4 w-4" /> Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== KPI CARDS (Summary) ===== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                    {KPI_DATA.map(kpi => {
                        const isSelected = selectedMetric === kpi.key;
                        return (
                            <button
                                key={kpi.key}
                                onClick={() => setSelectedMetric(kpi.key)}
                                className={`
                                    relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200 text-left
                                    hover:shadow-md hover:-translate-y-1 group
                                    ${isSelected ? "bg-card ring-2 ring-primary border-transparent shadow-md" : "bg-card border-border"}
                                `}
                            >
                                <div className={`p-2 rounded-lg mb-3 ${kpi.bg}`}>
                                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">{kpi.label}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold">{kpi.count}</span>
                                    </div>
                                    {kpi.value !== undefined && (
                                        <span className={`text-[10px] font-medium ${kpi.key === "tendersWon" ? "text-emerald-600" : "text-muted-foreground"}`}>
                                            {formatCurrency(kpi.value)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ===== CHARTS: TENDER OUTCOMES, TRENDS, SCORING ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tender Outcome Distribution */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <PieChartIcon className="h-5 w-5 text-primary" />
                                Tender Outcome Distribution
                            </CardTitle>
                            <CardDescription>Breakdown of tenders by their final outcome for the selected location(s).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={TENDER_OUTCOME_DATA} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="count">
                                            {TENDER_OUTCOME_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number, name: string) => [`${value} Tenders`, name]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location Performance Trends */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Performance Trends (Last 6 Months)
                                </CardTitle>
                                <CardDescription>Win Rate and Total Value Won over time for the selected location.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={locationTrends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={12} tickFormatter={value => `${value}%`} domain={[0, 100]} />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            axisLine={false}
                                            tickLine={false}
                                            fontSize={12}
                                            tickFormatter={formatCurrency}
                                            domain={[0, "auto"]}
                                        />
                                        <RechartsTooltip
                                            formatter={(value: number, name: string) => {
                                                if (name.includes("Rate")) return [`${value}%`, name];
                                                return [formatCurrency(value), name];
                                            }}
                                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                        />
                                        <Legend />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="winRate"
                                            name="Win Rate (%)"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="totalValueWon"
                                            name="Total Value Won"
                                            stroke="#6366F1"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Location Performance Score */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                    <CardHeader>
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                Location Performance Score
                            </CardTitle>
                            <CardDescription>A composite score reflecting this location's overall business health and potential.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="h-[250px] w-full md:w-1/2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={SCORING_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="score">
                                            {SCORING_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full md:w-1/2 space-y-4">
                                {SCORING_DATA.map((item, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-muted-foreground">{item.name}</span>
                                            <span className="font-bold">{item.score}/100</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.fill }} />
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-lg">Total Score</span>
                                        <Badge variant="default" className="text-lg px-3 py-1">
                                            {totalScore}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== BREAKDOWN CHARTS (Geographical, Item Heading, Team Type) ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Geographical Breakdown (Bar Chart) */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {selectedStateId ? <Landmark className="h-5 w-5 text-primary" /> : <MapPin className="h-5 w-5 text-primary" />}
                                Value by {selectedStateId ? "City" : selectedRegionId ? "State" : "State"}
                            </CardTitle>
                            <CardDescription>
                                Value distribution across {selectedStateId ? "cities" : selectedRegionId ? "states" : "major states"} in the selected area.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={geographicalBreakdown}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis tickFormatter={formatCurrency} fontSize={12} />
                                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#3B82F6" /> {/* Blue-500 */}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Item Heading Breakdown (Bar Chart) */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-primary" />
                                Value by Item Heading
                            </CardTitle>
                            <CardDescription>Contribution of different item categories to the total value in this location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={itemHeadingBreakdown}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis tickFormatter={formatCurrency} fontSize={12} />
                                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Type Breakdown (Bar Chart) */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Value by Team Type
                            </CardTitle>
                            <CardDescription>Breakdown of value generated by different internal teams in this location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={teamTypeBreakdown}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis tickFormatter={formatCurrency} fontSize={12} />
                                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ===== ALL TENDERS (FILTERED BY SELECTED METRIC) ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {KPI_DATA.find(k => k.key === selectedMetric)?.label} Tenders
                                <Badge variant="secondary">{locationTenders.length}</Badge>
                            </CardTitle>
                            <CardDescription>Detailed list of tenders associated with the selected location(s).</CardDescription>
                        </div>
                        <div className="relative w-64 hidden sm:block">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search tenders..." className="pl-8 h-9" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Tender No</TableHead>
                                    <TableHead>Tender Name</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Item Heading</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Executive</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {locationTenders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            No tenders found for this category.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    locationTenders.map(tender => (
                                        <TableRow key={tender.id}>
                                            <TableCell className="font-medium text-muted-foreground">{tender.tenderNo}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={tender.tenderName}>
                                                {tender.tenderName}
                                            </TableCell>
                                            <TableCell>{tender.organizationName}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {tender.city}, {tender.state}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{tender.region}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{tender.itemHeadingName}</div>
                                                <div className="text-sm text-muted-foreground">{tender.teamType}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tender.value)}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_COLOR_MAP[tender.status] as any}>{tender.status}</Badge>
                                            </TableCell>
                                            <TableCell>{tender.tenderExecutive}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
