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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Placeholder for a hook to fetch headings, if you have one
// import { useHeadings } from "./business.hooks";

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
    Globe, // For Region
    MapPin, // For State
    Tag, // For Item
    DollarSign, // For Value
    Percent, // For Percentage metrics
    Target, // For Scoring
    BarChart3, // For overall summary
    Sparkles, // For a "Business Insight Score"
    ListChecks, // For items handled
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
    "Under Review": "blue",
    "In Progress": "indigo",
    Completed: "success",
};

/* ================================
   DUMMY DATA INTERFACES
================================ */
interface Heading {
    id: number;
    name: string;
    team: string; // From the blade file, headings have an associated team
}

interface BusinessSummary {
    totalTenders: number;
    tendersWon: number;
    tendersLost: number;
    tendersSubmitted: number;
    tendersNegotiation: number;
    totalValue: number;
    totalValueWon: number;
    totalValueLost: number;
    winRate: number; // percentage
    conversionRate: number; // submitted to won percentage
    averageTenderValue: number;
}

interface BusinessTender {
    id: string;
    tenderNo: string;
    tenderName: string;
    organizationName: string;
    value: number;
    status: "Won" | "Lost" | "Submitted" | "Negotiation" | "Pending" | "Not Bid" | "Under Review" | "In Progress" | "Completed";
    itemHeading: string;
    item: string; // Specific item under the heading
    region: string;
    state: string;
    teamMember: string;
    dueDate: string; // "YYYY-MM-DD"
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
    totalValue: number; // monetary value
}

interface MetricBreakdown {
    name: string; // Region, State, Item name
    count: number;
    value: number;
}

interface BusinessScoring {
    revenueGrowthScore: number;
    winEfficiencyScore: number;
    diversityScore: number; // Based on regions/items
    total: number;
}

type BusinessScoringKey = "Revenue Growth" | "Win Efficiency" | "Diversity";

/* ================================
   DUMMY DATA GENERATION
================================ */

const dummyHeadings: Heading[] = [
    { id: 1, name: "Civil Projects", team: "Construction" },
    { id: 2, name: "IT Solutions", team: "Technology" },
    { id: 3, name: "Mechanical Equipment", team: "Engineering" },
    { id: 4, name: "Electrical Services", team: "Utilities" },
    { id: 5, name: "Consulting Services", team: "Advisory" },
];

const dummyRegions = ["North", "South", "East", "West", "Central"];
const dummyStates = ["Delhi", "Maharashtra", "Karnataka", "West Bengal", "Gujarat", "Tamil Nadu", "Uttar Pradesh", "Rajasthan"];
const dummyItems = [
    "Software Development",
    "Hardware Supply",
    "Network Setup",
    "Building Construction",
    "Road Pavement",
    "HVAC Installation",
    "Turbine Maintenance",
    "Solar Panel Setup",
];

const generateDummyBusinessSummary = (headingId: number | null, fromDate: string | null, toDate: string | null): BusinessSummary => {
    const base = headingId ? headingId * 15 + 100 : 200;
    const rand = () => Math.floor(Math.random() * 20);
    const dateFactor = fromDate && toDate ? 1.2 : 1;

    const tendersWon = Math.round((base + rand()) * dateFactor * 0.3);
    const tendersLost = Math.round((base + rand()) * dateFactor * 0.2);
    const tendersSubmitted = Math.round((base + rand()) * dateFactor * 0.4);
    const tendersNegotiation = Math.round((base + rand()) * dateFactor * 0.1);

    const totalTenders = tendersWon + tendersLost + tendersSubmitted + tendersNegotiation + Math.floor(rand() / 2); // Add some pending/other

    const totalValueWon = tendersWon * (750000 + rand() * 200000) * dateFactor;
    const totalValueLost = tendersLost * (300000 + rand() * 100000) * dateFactor;
    const totalValueSubmitted = tendersSubmitted * (500000 + rand() * 150000) * dateFactor;

    const totalValue = totalValueWon + totalValueLost + totalValueSubmitted;

    const winRate = tendersWon + tendersLost > 0 ? Math.round((tendersWon / (tendersWon + tendersLost)) * 100) : 0;
    const conversionRate = tendersSubmitted > 0 ? Math.round((tendersWon / tendersSubmitted) * 100) : 0;
    const averageTenderValue = totalTenders > 0 ? Math.round(totalValue / totalTenders) : 0;

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
        conversionRate,
        averageTenderValue,
    };
};

const generateDummyBusinessTenders = (headingId: number | null, selectedMetric: string, fromDate: string | null, toDate: string | null): BusinessTender[] => {
    const tenders: BusinessTender[] = [];
    const baseCount = headingId ? 20 + headingId * 5 : 50;
    const currentHeading = dummyHeadings.find(h => h.id === headingId);

    for (let i = 0; i < baseCount; i++) {
        const statusRand = Math.random();
        let status: BusinessTender["status"];
        if (statusRand < 0.3) status = "Won";
        else if (statusRand < 0.5) status = "Lost";
        else if (statusRand < 0.7) status = "Submitted";
        else if (statusRand < 0.85) status = "Negotiation";
        else status = "Pending";

        const tenderNo = `BUS-TEN-${Math.floor(Math.random() * 100000)}`;
        const organizationName = `Client ${Math.floor(Math.random() * 8) + 1}`;
        const tenderName = `${currentHeading?.name || "Project"} ${Math.floor(Math.random() * 200)} - Task ${(i % 5) + 1}`;
        const value = Math.floor(Math.random() * 8000000) + 200000;
        const region = dummyRegions[Math.floor(Math.random() * dummyRegions.length)];
        const state = dummyStates[Math.floor(Math.random() * dummyStates.length)];
        const item = dummyItems[Math.floor(Math.random() * dummyItems.length)];
        const teamMember = `Exec ${Math.floor(Math.random() * 10) + 1}`;
        const dueDate = `2024-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`;

        tenders.push({
            id: `biz-task-${i}`,
            tenderNo,
            tenderName,
            organizationName,
            value,
            status,
            itemHeading: currentHeading?.name || "General Business",
            item,
            region,
            state,
            teamMember,
            dueDate,
        });
    }

    return tenders.filter(t => {
        if (selectedMetric === "total") return true;
        if (selectedMetric === "tendersWon") return t.status === "Won";
        if (selectedMetric === "tendersLost") return t.status === "Lost";
        if (selectedMetric === "tendersSubmitted") return t.status === "Submitted";
        if (selectedMetric === "tendersNegotiation") return t.status === "Negotiation";
        return true;
    });
};

const generateDummyBusinessTrends = (headingId: number | null): TrendData[] => {
    return Array.from({ length: 6 }).map((_, i) => ({
        label: `M-${i + 1}`, // Month 1, 2, ...
        winRate: 20 + Math.floor(Math.random() * 30) + (headingId ? headingId * 2 : 0),
        totalValue: (10000000 + Math.floor(Math.random() * 5000000)) * (headingId ? headingId * 0.5 : 1),
    }));
};

const generateDummyMetricBreakdown = (data: BusinessTender[], type: "region" | "state" | "item"): MetricBreakdown[] => {
    const breakdownMap: { [key: string]: { count: number; value: number } } = {};

    data.forEach(tender => {
        let key: string;
        if (type === "region") key = tender.region;
        else if (type === "state") key = tender.state;
        else key = tender.item;

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

const generateDummyBusinessScoring = (summary: BusinessSummary): BusinessScoring => {
    const revenueGrowthScore = Math.min(100, Math.round((summary.totalValueWon / 10000000) * 50 + (summary.totalValue / 20000000) * 50)); // Scale based on total and won value
    const winEfficiencyScore = Math.min(100, Math.round(summary.winRate * 0.8 + summary.conversionRate * 0.2));
    const diversityScore = Math.min(100, Math.round(Math.random() * 50 + 50)); // Placeholder, could be based on number of unique regions/items
    const total = Math.round(revenueGrowthScore * 0.4 + winEfficiencyScore * 0.3 + diversityScore * 0.3);
    return { revenueGrowthScore, winEfficiencyScore, diversityScore, total };
};

/* ================================
   MAIN PAGE COMPONENT
================================ */

export default function BusinessPerformanceDashboard() {
    const [selectedHeadingId, setSelectedHeadingId] = useState<number | null>(null);
    const [fromDate, setFromDate] = useState<string | null>(null);
    const [toDate, setToDate] = useState<string | null>(null);
    const [selectedMetric, setSelectedMetric] = useState("total"); // For KPI cards and filtering the tender list

    // Replace useHeadings with dummyHeadings for now
    const headings = dummyHeadings;

    // Generate dummy data based on filters
    const summary = useMemo(() => generateDummyBusinessSummary(selectedHeadingId, fromDate, toDate), [selectedHeadingId, fromDate, toDate]);
    const businessTenderList = useMemo(
        () => generateDummyBusinessTenders(selectedHeadingId, selectedMetric, fromDate, toDate),
        [selectedHeadingId, selectedMetric, fromDate, toDate]
    );
    const businessTrends = useMemo(() => generateDummyBusinessTrends(selectedHeadingId), [selectedHeadingId]);
    const businessScoring = useMemo(() => generateDummyBusinessScoring(summary), [summary]);

    // Breakdown metrics
    const regionMetrics = useMemo(() => generateDummyMetricBreakdown(businessTenderList, "region"), [businessTenderList]);
    const stateMetrics = useMemo(() => generateDummyMetricBreakdown(businessTenderList, "state"), [businessTenderList]);
    const itemMetrics = useMemo(() => generateDummyMetricBreakdown(businessTenderList, "item"), [businessTenderList]);

    // KPI Card Data for Business Performance
    const KPI_DATA = useMemo((): KPICard[] => {
        return [
            {
                key: "total",
                label: "Total Tenders",
                count: summary.totalTenders,
                value: summary.totalValue,
                icon: BarChart3,
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
                key: "tendersNegotiation",
                label: "Tenders In Negotiation",
                count: summary.tendersNegotiation,
                icon: ListChecks,
                color: "text-amber-600",
                bg: "bg-amber-50",
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
                key: "conversionRate",
                label: "Conversion Rate",
                count: formatPercentage(summary.conversionRate),
                icon: TrendingUp,
                color: "text-purple-600",
                bg: "bg-purple-50",
            },
            {
                key: "averageTenderValue",
                label: "Avg Tender Value",
                count: formatCurrency(summary.averageTenderValue), // Display directly as formatted currency
                icon: DollarSign,
                color: "text-cyan-600",
                bg: "bg-cyan-50",
            },
        ];
    }, [summary]);

    const SCORING_COLORS: Record<BusinessScoringKey, string> = {
        "Revenue Growth": "#82CA9D", // Green
        "Win Efficiency": "#8884D8", // Purple
        Diversity: "#FFC658", // Yellow
    };

    const SCORING_DATA = businessScoring
        ? [
              { name: "Revenue Growth", score: businessScoring.revenueGrowthScore },
              { name: "Win Efficiency", score: businessScoring.winEfficiencyScore },
              { name: "Diversity", score: businessScoring.diversityScore },
          ].map(item => ({
              ...item,
              fill: SCORING_COLORS[item.name as BusinessScoringKey],
          }))
        : [];

    const totalScore = businessScoring?.total ?? (SCORING_DATA.length ? Math.round(SCORING_DATA.reduce((sum, item) => sum + item.score, 0) / SCORING_DATA.length) : 0);

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
                        <h1 className="text-3xl font-bold tracking-tight">Business Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze overall business performance across item headings, regions, and states.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Heading</label>
                                <Select value={selectedHeadingId ? selectedHeadingId.toString() : undefined} onValueChange={v => setSelectedHeadingId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Item Heading" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {headings?.map(heading => (
                                            <SelectItem key={heading.id} value={heading.id.toString()}>
                                                {heading.name} ({heading.team})
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
                            <Button className="w-full md:w-auto" disabled={!selectedHeadingId}>
                                <Filter className="mr-2 h-4 w-4" /> Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== KPI CARDS (Summary) ===== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3">
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
                                <Briefcase className="h-5 w-5 text-primary" />
                                Tender Outcome Distribution
                            </CardTitle>
                            <CardDescription>Breakdown of tenders by their final outcome.</CardDescription>
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

                    {/* Business Performance Trends */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Business Performance Trends
                                </CardTitle>
                                <CardDescription>Win Rate and Total Value over the last 6 months</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={businessTrends}>
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
                                            dataKey="totalValue"
                                            name="Total Value"
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

                {/* Business Performance Scoring */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                    <CardHeader>
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Business Insight Score
                            </CardTitle>
                            <CardDescription>Weighted scores based on Revenue Growth, Win Efficiency, and Diversity.</CardDescription>
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

                {/* ===== METRICS TABLES (Region-wise, State-wise, Item-wise) ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Region-wise Metrics */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="h-5 w-5 text-primary" />
                                Region-wise Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Region</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {regionMetrics.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        regionMetrics.map((metric, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{metric.name}</TableCell>
                                                <TableCell className="text-right">{metric.count}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(metric.value)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* State-wise Metrics */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                State-wise Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>State</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stateMetrics.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        stateMetrics.map((metric, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{metric.name}</TableCell>
                                                <TableCell className="text-right">{metric.count}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(metric.value)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Item-wise Metrics */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Tag className="h-5 w-5 text-primary" />
                                Item-wise Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemMetrics.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        itemMetrics.map((metric, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{metric.name}</TableCell>
                                                <TableCell className="text-right">{metric.count}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(metric.value)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* ===== ALL TENDERS (FILTERED BY SELECTED METRIC) ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {KPI_DATA.find(k => k.key === selectedMetric)?.label} Tenders
                                <Badge variant="secondary">{businessTenderList.length}</Badge>
                            </CardTitle>
                            <CardDescription>Detailed list of tenders related to the selected item heading.</CardDescription>
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
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Tender Name</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Region/State</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {businessTenderList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No tenders found for this category.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    businessTenderList.map(tender => (
                                        <TableRow key={tender.id}>
                                            <TableCell className="font-medium text-muted-foreground">{tender.tenderNo}</TableCell>
                                            <TableCell>{tender.organizationName}</TableCell>
                                            <TableCell className="max-w-[250px] truncate" title={tender.tenderName}>
                                                {tender.tenderName}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{tender.item}</div>
                                                <div className="text-sm text-muted-foreground">{tender.itemHeading}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{tender.region}</div>
                                                <div className="text-sm text-muted-foreground">{tender.state}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tender.value)}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_COLOR_MAP[tender.status] as any}>{tender.status}</Badge>
                                            </TableCell>
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
