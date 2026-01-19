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
// Placeholder for a hook to fetch organizations and item headings
// import { useOrganizations, useItemHeadings } from "./customer.hooks";

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
    Handshake, // For Customer Relationship
    Coins, // For total revenue
    RefreshCcw, // For repeat business
    LayoutGrid, // For item heading breakdown
    Users, // For team type breakdown
    HeartHandshake, // For customer health
    ListChecks,
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
interface Organization {
    id: number;
    name: string;
}

interface ItemHeading {
    id: number;
    name: string;
}

interface CustomerSummary {
    totalTenders: number;
    tendersWon: number;
    tendersLost: number;
    tendersSubmitted: number;
    tendersNegotiation: number;
    totalValue: number;
    totalValueWon: number;
    totalValueLost: number;
    winRate: number; // percentage
    engagementRate: number; // how many tenders submitted vs total potential (dummy for now)
    repeatBusinessCount: number; // how many unique tenders from this customer in given period
    averageDealValue: number;
}

interface CustomerTender {
    id: string;
    tenderNo: string;
    tenderName: string;
    itemHeadingId: number;
    itemHeadingName: string;
    teamType: "AC" | "DC";
    value: number;
    status: "Won" | "Lost" | "Submitted" | "Negotiation" | "Pending";
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
    name: string; // Item Heading name or Team Type
    count: number;
    value: number;
}

interface CustomerScoring {
    revenueContribution: number;
    winRateConsistency: number;
    engagementLevel: number;
    total: number;
}

type CustomerScoringKey = "Revenue Contribution" | "Win Rate Consistency" | "Engagement Level";

/* ================================
   DUMMY DATA GENERATION
================================ */

const dummyOrgs: Organization[] = [
    { id: 1, name: "MegaCorp Solutions" },
    { id: 2, name: "Global Industries" },
    { id: 3, name: "Tech Innovations Ltd." },
    { id: 4, name: "Apex Enterprises" },
    { id: 5, name: "Dynamic Systems" },
];

const dummyItemHeadings: ItemHeading[] = [
    { id: 101, name: "Software Services" },
    { id: 102, name: "Infrastructure Projects" },
    { id: 103, name: "Consulting & Advisory" },
    { id: 104, name: "Hardware Procurement" },
];

const dummyTeamTypes = ["AC", "DC"];

const generateDummyCustomerSummary = (
    orgId: number | null,
    teamType: string | null,
    itemHeadingId: number | null,
    fromDate: string | null,
    toDate: string | null
): CustomerSummary => {
    const base = orgId ? orgId * 20 + 100 : 300;
    const rand = () => Math.floor(Math.random() * 25);
    const dateFactor = fromDate && toDate ? 1.2 : 1;
    const teamFactor = teamType === "AC" ? 1.1 : teamType === "DC" ? 0.9 : 1;
    const itemFactor = itemHeadingId ? (itemHeadingId % 2 === 0 ? 1.05 : 0.95) : 1;

    const tendersWon = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.3);
    const tendersLost = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.2);
    const tendersSubmitted = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.4);
    const tendersNegotiation = Math.round((base + rand()) * dateFactor * teamFactor * itemFactor * 0.1);

    const totalTenders = tendersWon + tendersLost + tendersSubmitted + tendersNegotiation + Math.floor(rand() / 3);

    const totalValueWon = tendersWon * (800000 + rand() * 250000) * dateFactor * teamFactor;
    const totalValueLost = tendersLost * (350000 + rand() * 120000) * dateFactor * teamFactor;
    const totalValueSubmitted = tendersSubmitted * (600000 + rand() * 180000) * dateFactor * teamFactor;

    const totalValue = totalValueWon + totalValueLost + totalValueSubmitted;

    const winRate = tendersWon + tendersLost > 0 ? Math.round((tendersWon / (tendersWon + tendersLost)) * 100) : 0;
    const engagementRate = totalTenders > 0 ? Math.round((tendersSubmitted / totalTenders) * 100 + Math.random() * 10) : 0; // Simplified
    const repeatBusinessCount = Math.floor(totalTenders / 5) + Math.floor(rand() / 5);
    const averageDealValue = totalTenders > 0 ? Math.round(totalValue / totalTenders) : 0;

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
        engagementRate,
        repeatBusinessCount,
        averageDealValue,
    };
};

const generateDummyCustomerTenders = (
    orgId: number | null,
    teamType: string | null,
    itemHeadingId: number | null,
    selectedMetric: string,
    fromDate: string | null,
    toDate: string | null
): CustomerTender[] => {
    const tenders: CustomerTender[] = [];
    const baseCount = orgId ? 25 + orgId * 5 : 75;
    const currentOrg = dummyOrgs.find(o => o.id === orgId);

    for (let i = 0; i < baseCount; i++) {
        const statusRand = Math.random();
        let status: CustomerTender["status"];
        if (statusRand < 0.35) status = "Won";
        else if (statusRand < 0.55) status = "Lost";
        else if (statusRand < 0.75) status = "Submitted";
        else if (statusRand < 0.9) status = "Negotiation";
        else status = "Pending";

        const tenderNo = `CUS-TEN-${Math.floor(Math.random() * 100000)}`;
        const tenderName = `${currentOrg?.name || "Customer"} Project ${Math.floor(Math.random() * 200)} - Phase ${(i % 7) + 1}`;
        const value = Math.floor(Math.random() * 10000000) + 500000;
        const randomItemHeading = dummyItemHeadings[Math.floor(Math.random() * dummyItemHeadings.length)];
        const randomTeamType = dummyTeamTypes[Math.floor(Math.random() * dummyTeamTypes.length)];
        const submissionDate = `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`;

        tenders.push({
            id: `cust-task-${i}`,
            tenderNo,
            tenderName,
            itemHeadingId: randomItemHeading.id,
            itemHeadingName: randomItemHeading.name,
            teamType: randomTeamType as "AC" | "DC",
            value,
            status,
            tenderExecutive: `Exec ${Math.floor(Math.random() * 15) + 1}`,
            submissionDate,
        });
    }

    return tenders.filter(t => {
        let matchesFilters = true;
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
        if (selectedMetric === "repeatBusinessCount") return true; // All tenders contribute to repeat
        return true;
    });
};

const generateDummyCustomerTrends = (orgId: number | null): TrendData[] => {
    return Array.from({ length: 6 }).map((_, i) => ({
        label: `M-${i + 1}`, // Month 1, 2, ...
        winRate: 30 + Math.floor(Math.random() * 40) + (orgId ? orgId * 3 : 0),
        totalValueWon: (5000000 + Math.floor(Math.random() * 8000000)) * (orgId ? orgId * 0.7 : 1),
    }));
};

const generateDummyBreakdownData = (data: CustomerTender[], type: "itemHeading" | "teamType"): BreakdownMetric[] => {
    const breakdownMap: { [key: string]: { count: number; value: number } } = {};

    data.forEach(tender => {
        let key: string;
        if (type === "itemHeading") key = tender.itemHeadingName;
        else key = tender.teamType;

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

const generateDummyCustomerScoring = (summary: CustomerSummary): CustomerScoring => {
    const revenueContribution = Math.min(100, Math.round((summary.totalValueWon / 20000000) * 60 + Math.random() * 20)); // Scale based on won value
    const winRateConsistency = Math.min(100, Math.round(summary.winRate * 0.9 + summary.engagementRate * 0.1));
    const engagementLevel = Math.min(100, Math.round(summary.repeatBusinessCount * 10 + summary.engagementRate * 0.5));
    const total = Math.round(revenueContribution * 0.4 + winRateConsistency * 0.3 + engagementLevel * 0.3);
    return { revenueContribution, winRateConsistency, engagementLevel, total };
};

/* ================================
   MAIN PAGE COMPONENT
================================ */

export default function CustomerPerformance() {
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
    const [selectedTeamType, setSelectedTeamType] = useState<string | null>(null);
    const [selectedItemHeadingId, setSelectedItemHeadingId] = useState<number | null>(null);
    const [fromDate, setFromDate] = useState<string | null>(null);
    const [toDate, setToDate] = useState<string | null>(null);
    const [selectedMetric, setSelectedMetric] = useState("total"); // For KPI cards and filtering the tender list

    // Replace hooks with dummy data for now
    const organizations = dummyOrgs;
    const itemHeadings = dummyItemHeadings;

    // Generate dummy data based on filters
    const summary = useMemo(
        () => generateDummyCustomerSummary(selectedOrgId, selectedTeamType, selectedItemHeadingId, fromDate, toDate),
        [selectedOrgId, selectedTeamType, selectedItemHeadingId, fromDate, toDate]
    );
    const customerTenders = useMemo(
        () => generateDummyCustomerTenders(selectedOrgId, selectedTeamType, selectedItemHeadingId, selectedMetric, fromDate, toDate),
        [selectedOrgId, selectedTeamType, selectedItemHeadingId, selectedMetric, fromDate, toDate]
    );
    const customerTrends = useMemo(() => generateDummyCustomerTrends(selectedOrgId), [selectedOrgId]);
    const customerScoring = useMemo(() => generateDummyCustomerScoring(summary), [summary]);

    // Breakdown metrics
    const itemHeadingBreakdown = useMemo(() => generateDummyBreakdownData(customerTenders, "itemHeading"), [customerTenders]);
    const teamTypeBreakdown = useMemo(() => generateDummyBreakdownData(customerTenders, "teamType"), [customerTenders]);

    // KPI Card Data for Customer Performance
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
                key: "engagementRate",
                label: "Engagement Rate",
                count: formatPercentage(summary.engagementRate),
                icon: Handshake,
                color: "text-purple-600",
                bg: "bg-purple-50",
            },
            {
                key: "repeatBusinessCount",
                label: "Repeat Business",
                count: summary.repeatBusinessCount,
                icon: RefreshCcw,
                color: "text-cyan-600",
                bg: "bg-cyan-50",
            },
            {
                key: "averageDealValue",
                label: "Avg Deal Value",
                count: formatCurrency(summary.averageDealValue),
                icon: DollarSign,
                color: "text-orange-600",
                bg: "bg-orange-50",
            },
        ];
    }, [summary]);

    const SCORING_COLORS: Record<CustomerScoringKey, string> = {
        "Revenue Contribution": "#34D399", // Green
        "Win Rate Consistency": "#818CF8", // Indigo
        "Engagement Level": "#FB923C", // Orange
    };

    const SCORING_DATA = customerScoring
        ? [
              { name: "Revenue Contribution", score: customerScoring.revenueContribution },
              { name: "Win Rate Consistency", score: customerScoring.winRateConsistency },
              { name: "Engagement Level", score: customerScoring.engagementLevel },
          ].map(item => ({
              ...item,
              fill: SCORING_COLORS[item.name as CustomerScoringKey],
          }))
        : [];

    const totalScore = customerScoring?.total ?? (SCORING_DATA.length ? Math.round(SCORING_DATA.reduce((sum, item) => sum + item.score, 0) / SCORING_DATA.length) : 0);

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
                        <h1 className="text-3xl font-bold tracking-tight">Customer Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze performance and engagement with specific organizations.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-sm font-medium">Organization</label>
                                <Select value={selectedOrgId ? selectedOrgId.toString() : undefined} onValueChange={v => setSelectedOrgId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Organization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations?.map(org => (
                                            <SelectItem key={org.id} value={org.id.toString()}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team Type</label>
                                <Select value={selectedTeamType ?? ""} onValueChange={setSelectedTeamType}>
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
                                <Select value={selectedItemHeadingId ? selectedItemHeadingId.toString() : undefined} onValueChange={v => setSelectedItemHeadingId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Item Heading" />
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
                            <div className="md:col-span-1">
                                <Button className="w-full" disabled={!selectedOrgId}>
                                    <Filter className="mr-2 h-4 w-4" /> Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== KPI CARDS (Summary) ===== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
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
                            <CardDescription>Breakdown of tenders by their final outcome for this customer.</CardDescription>
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

                    {/* Customer Performance Trends */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Performance Trends (Last 6 Months)
                                </CardTitle>
                                <CardDescription>Win Rate and Total Value Won over time for this customer.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={customerTrends}>
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

                {/* Customer Relationship Score */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                    <CardHeader>
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <HeartHandshake className="h-5 w-5 text-primary" />
                                Customer Relationship Score
                            </CardTitle>
                            <CardDescription>A composite score reflecting this customer's overall value and engagement.</CardDescription>
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

                {/* ===== BREAKDOWN CHARTS (Item Heading, Team Type) ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Item Heading Breakdown (Bar Chart) */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-primary" />
                                Value by Item Heading
                            </CardTitle>
                            <CardDescription>Contribution of different item categories to the total value for this customer.</CardDescription>
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
                            <CardDescription>Breakdown of value generated by different internal teams.</CardDescription>
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

                {/* ===== ALL TENDERS WITH CUSTOMER (FILTERED BY SELECTED METRIC) ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {KPI_DATA.find(k => k.key === selectedMetric)?.label} Tenders
                                <Badge variant="secondary">{customerTenders.length}</Badge>
                            </CardTitle>
                            <CardDescription>Detailed list of tenders associated with the selected customer.</CardDescription>
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
                                    <TableHead>Item Heading</TableHead>
                                    <TableHead>Team Type</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Executive</TableHead>
                                    <TableHead>Submission Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerTenders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            No tenders found for this category.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customerTenders.map(tender => (
                                        <TableRow key={tender.id}>
                                            <TableCell className="font-medium text-muted-foreground">{tender.tenderNo}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={tender.tenderName}>
                                                {tender.tenderName}
                                            </TableCell>
                                            <TableCell>{tender.itemHeadingName}</TableCell>
                                            <TableCell>{tender.teamType}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tender.value)}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_COLOR_MAP[tender.status] as any}>{tender.status}</Badge>
                                            </TableCell>
                                            <TableCell>{tender.tenderExecutive}</TableCell>
                                            <TableCell>{tender.submissionDate}</TableCell>
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
