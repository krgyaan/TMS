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
import { useOemNotAllowed, useOemRfqs, useOemScoring, useOemSummary, useOemTenders, useOemTrends } from "./oem-performance.hooks";

/* Icons */
import {
    Filter,
    Download,
    Calendar as CalendarIcon,
    Search,
    Trophy,
    XCircle,
    FileText,
    Clock,
    Target,
    TrendingUp,
    Briefcase,
    Eye,
    Hammer,
    Mail,
    Megaphone,
    Percent,
    Handshake,
    BadgePercent,
} from "lucide-react";
import { useVendors } from "@/hooks/api/useVendors";
import { useVendorOrganization, useVendorOrganizations } from "@/hooks/api/useVendorOrganizations";

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

const STATUS_COLOR_MAP: Record<string, string> = {
    Won: "default",
    Lost: "destructive",
    Submitted: "secondary",
    "Not Allowed": "destructive",
    "RFQ Sent": "blue",
    "RFQ Responded": "success",
    Pending: "warning",
    Missed: "destructive",
    "Not Bid": "warning",
};

/* ================================
   DUMMY DATA INTERFACES
================================ */
interface Oem {
    id: number;
    name: string;
}

interface OemSummary {
    totalTendersWithOem: number;
    tendersWon: number;
    tendersLost: number;
    tendersSubmitted: number;
    tendersNotAllowed: number;
    rfqsSent: number;
    rfqsResponded: number;
    totalValueWon: number;
    totalValueLost: number;
    totalValueSubmitted: number;
    winRate: number; // percentage
    rfqResponseRate: number; // percentage
}

interface OemTender {
    id: string;
    tenderNo: string;
    tenderName: string;
    organizationName: string;
    value: number;
    status: "Won" | "Lost" | "Submitted" | "Not Allowed" | "RFQ Sent" | "RFQ Responded";
    teamMember: string;
    team: string;
    gstValue: number;
    dueDate: string; // "YYYY-MM-DD"
    rfqSentOn?: string; // "YYYY-MM-DD"
    rfqResponseOn?: string; // "YYYY-MM-DD"
}

interface OemNotAllowedTender extends OemTender {
    reason: string; // dummy reason
}

interface OemRfqSentTender extends OemTender {
    rfqSentOn: string;
    rfqResponseOn?: string;
}

interface OemKPICard {
    key: string;
    label: string;
    count: number;
    value?: number;
    icon: any;
    color: string;
    bg: string;
    percentage?: number; // For win rate, RFQ response rate
}

interface OemTrendData {
    label: string; // e.g., 'Jan', 'Feb'
    winRate: number; // percentage
    rfqResponseRate: number; // percentage
}

interface OemScoring {
    winRateScore: number;
    responseEfficiencyScore: number;
    complianceScore: number; // Based on tenders not allowed
    total: number;
}

type OemScoringKey = "Win Rate" | "Response Efficiency" | "Compliance";

export default function OemPerformanceDashboard() {
    const [selectedOemId, setSelectedOemId] = useState<number | null>(6);
    const [fromDate, setFromDate] = useState<string | null>("2025-01-01");
    const [toDate, setToDate] = useState<string | null>("2025-12-01");
    const [selectedMetric, setSelectedMetric] = useState("total");

    const enabled = !!selectedOemId && !!fromDate && !!toDate;

    const params = useMemo(
        () => (enabled ? { oemId: selectedOemId!, fromDate: fromDate!, toDate: toDate!, metric: selectedMetric } : null),
        [selectedOemId, fromDate, toDate, selectedMetric]
    );

    const { data: oems = [] } = useVendorOrganizations();
    console.log(oems);

    // Generate dummy data based on filters
    const { data: tendersNotAllowed = [] } = useOemNotAllowed(params!, enabled);
    const { data: rfqsSent = [] } = useOemRfqs(params!, enabled);
    const { data: oemTenderList = [] } = useOemTenders(params!, enabled);
    const { data: oemTrends = [] } = useOemTrends(params!, enabled);
    const { data: summary } = useOemSummary(params!, enabled);
    const { data: oemScoring } = useOemScoring(params!, enabled);
    // KPI Card Data for OEM
    const OEM_KPI_DATA = useMemo((): OemKPICard[] => {
        return [
            {
                key: "total",
                label: "Total Tenders with OEM",
                count: summary?.totalTendersWithOem,
                icon: Briefcase,
                color: "text-blue-600",
                bg: "bg-blue-50",
            },
            {
                key: "tendersWon",
                label: "Tenders Won",
                count: summary?.tendersWon,
                value: summary?.totalValueWon,
                icon: Trophy,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
            {
                key: "tendersLost",
                label: "Tenders Lost",
                count: summary?.tendersLost,
                value: summary?.totalValueLost,
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-50",
            },
            {
                key: "tendersSubmitted",
                label: "Tenders Submitted",
                count: summary?.tendersSubmitted,
                value: summary?.totalValueSubmitted,
                icon: FileText,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
            },
            {
                key: "tendersNotAllowed",
                label: "Tenders Not Allowed",
                count: summary?.tendersNotAllowed,
                icon: Hammer,
                color: "text-orange-600",
                bg: "bg-orange-50",
            },
            {
                key: "rfqsSent",
                label: "RFQs Sent",
                count: summary?.rfqsSent,
                icon: Mail,
                color: "text-purple-600",
                bg: "bg-purple-50",
            },
            {
                key: "rfqsResponded",
                label: "RFQs Responded",
                count: summary?.rfqsResponded,
                icon: Megaphone,
                color: "text-cyan-600",
                bg: "bg-cyan-50",
            },
            {
                key: "winRate",
                label: "Win Rate",
                count: summary?.winRate,
                percentage: summary?.winRate,
                icon: BadgePercent,
                color: "text-green-600",
                bg: "bg-green-50",
            },
            {
                key: "rfqResponseRate",
                label: "RFQ Response Rate",
                count: summary?.rfqResponseRate,
                percentage: summary?.rfqResponseRate,
                icon: Percent,
                color: "text-teal-600",
                bg: "bg-teal-50",
            },
        ];
    }, [summary]);

    const SCORING_COLORS: Record<OemScoringKey, string> = {
        "Win Rate": "#34D399", // Green
        "Response Efficiency": "#60A5FA", // Blue
        Compliance: "#FBBF24", // Yellow
    };

    const SCORING_DATA = oemScoring
        ? [
              { name: "Win Rate", score: oemScoring.winRateScore },
              { name: "Response Efficiency", score: oemScoring.responseEfficiencyScore },
              { name: "Compliance", score: oemScoring.complianceScore },
          ].map(item => ({
              ...item,
              fill: SCORING_COLORS[item.name as OemScoringKey],
          }))
        : [];

    const totalScore = oemScoring?.total ?? (SCORING_DATA.length ? Math.round(SCORING_DATA.reduce((sum, item) => sum + item.score, 0) / SCORING_DATA.length) : 0);

    const TENDER_OUTCOME_DATA = [
        { name: "Won", count: summary?.tendersWon, fill: "#10B981" }, // emerald-500
        { name: "Lost", count: summary?.tendersLost, fill: "#EF4444" }, // red-500
        { name: "Submitted", count: summary?.tendersSubmitted, fill: "#6366F1" }, // indigo-500
        { name: "Not Allowed", count: summary?.tendersNotAllowed, fill: "#F97316" }, // orange-500
    ];

    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER & FILTERS ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">OEM Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze performance metrics and interactions with selected Original Equipment Manufacturers.</p>
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
                                <label className="text-sm font-medium">Select OEM</label>
                                <Select value={selectedOemId ? selectedOemId.toString() : undefined} onValueChange={v => setSelectedOemId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select OEM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {oems?.map(oem => (
                                            <SelectItem key={oem.id} value={oem.id.toString()}>
                                                {oem.name}
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
                            <Button className="w-full md:w-auto" disabled={!selectedOemId}>
                                <Filter className="mr-2 h-4 w-4" /> Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== KPI CARDS ===== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {OEM_KPI_DATA.map(kpi => {
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
                                        <span className="text-xl font-bold">{kpi.percentage !== undefined ? `${kpi.percentage}%` : kpi.count}</span>
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
                            <CardDescription>Breakdown of tenders associated with this OEM by outcome.</CardDescription>
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
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* OEM Performance Trends */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    OEM Performance Trends
                                </CardTitle>
                                <CardDescription>Win Rate and RFQ Response Rate over the last 5 periods</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={oemTrends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                        <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={value => `${value}%`} />
                                        <RechartsTooltip
                                            formatter={(value: number) => `${value}%`}
                                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="winRate" name="Win Rate (%)" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        <Line
                                            type="monotone"
                                            dataKey="rfqResponseRate"
                                            name="RFQ Response Rate (%)"
                                            stroke="#60A5FA"
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

                {/* OEM Scoring */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                    <CardHeader>
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                OEM Relationship Scoring
                            </CardTitle>
                            <CardDescription>Weighted scores based on Win Rate, Response Efficiency, and Compliance.</CardDescription>
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

                {/* ===== TENDERS NOT ALLOWED TABLE ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Hammer className="h-5 w-5 text-destructive" />
                            Tenders Not Allowed by This OEM
                            <Badge variant="secondary">{tendersNotAllowed.length}</Badge>
                        </CardTitle>
                        <CardDescription>List of tenders that could not proceed due to OEM specific restrictions or policies.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Team Member</TableHead>
                                    <TableHead>Tender</TableHead>
                                    <TableHead className="text-right">GST Value</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tendersNotAllowed.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No tenders found for this category.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tendersNotAllowed.map(tender => (
                                        <TableRow key={tender.id}>
                                            <TableCell>
                                                <div className="font-medium">{tender.teamMember}</div>
                                                <div className="text-sm text-muted-foreground">{tender.team} Team</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                    {tender.tenderName}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tender.gstValue)}</TableCell>
                                            <TableCell>{tender.dueDate}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{tender.reason}</TableCell>
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

                {/* ===== RFQs SENT TO THIS OEM TABLE ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Mail className="h-5 w-5 text-purple-600" />
                            RFQs Sent to This OEM
                            <Badge variant="secondary">{rfqsSent.length}</Badge>
                        </CardTitle>
                        <CardDescription>Detailed list of RFQs sent to this OEM and their response status.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Team Member</TableHead>
                                    <TableHead>Tender</TableHead>
                                    <TableHead className="text-right">GST Value</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>RFQ Sent On</TableHead>
                                    <TableHead>Response On</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rfqsSent.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No RFQs found for this category.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rfqsSent.map(tender => (
                                        <TableRow key={tender.id}>
                                            <TableCell>
                                                <div className="font-medium">{tender.teamMember}</div>
                                                <div className="text-sm text-muted-foreground">{tender.team} Team</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                    {tender.tenderName}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tender.gstValue)}</TableCell>
                                            <TableCell>{tender.dueDate}</TableCell>
                                            <TableCell>{tender.rfqSentOn}</TableCell>
                                            <TableCell>
                                                {tender.rfqResponseOn ? <Badge variant="default">{tender.rfqResponseOn}</Badge> : <Badge variant="secondary">Pending</Badge>}
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

                {/* ===== ALL TENDERS WORKED WITH THIS OEM TABLE (FILTERED BY SELECTED METRIC) ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {OEM_KPI_DATA.find(k => k.key === selectedMetric)?.label} Tenders
                                <Badge variant="secondary">{oemTenderList.length}</Badge>
                            </CardTitle>
                            <CardDescription>Comprehensive list of tenders associated with this OEM.</CardDescription>
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
                                    <TableHead>Team Member</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {oemTenderList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No tenders found for this category.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    oemTenderList.map(tender => (
                                        <TableRow key={tender.id}>
                                            <TableCell className="font-medium text-muted-foreground">{tender.tenderNo}</TableCell>
                                            <TableCell>{tender.organizationName}</TableCell>
                                            <TableCell className="max-w-[300px] truncate" title={tender.tenderName}>
                                                {tender.tenderName}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{tender.teamMember}</div>
                                                <div className="text-sm text-muted-foreground">{tender.team}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tender.value)}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_COLOR_MAP[tender.status] as "default" | "destructive" | "secondary" | "warning"}>{tender.status}</Badge>
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
