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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePerformanceOutcomes, useStageMatrix, usePerformanceSummary, usePerformanceTrends, useExecutiveScoring } from "./tender-executive.hooks";
import type { TenderKpiKey } from "./tender-executive.types";
import { ROW_HELP_TEXT } from "./stage-matrix-help";

/* Icons */
import {
    Filter,
    Download,
    Calendar as CalendarIcon,
    Search,
    Trophy,
    XCircle,
    AlertTriangle,
    FileText,
    Clock,
    Target,
    TrendingUp,
    CheckCircle2,
    Briefcase,
    Eye,
    ArrowRight,
    Info,
} from "lucide-react";
import { useUser, useUsers, useUsersByRole } from "@/hooks/api/useUsers";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { StageBacklogTable } from "./components/StageBacklogTable";
import { EmdBalanceTable } from "./components/EmdBalanceTable";

/* ================================
   HELPERS
================================ */
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const STAGE_ROW_TYPE_MAP: Record<string, string> = {
    done: "default",
    onTime: "success",
    late: "warning",
    pending: "info",
    overdue: "destructive",
    notApplicable: "default",
};

const formatLabel = (label: string) => {
    return label
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

/* ================================
   MAIN PAGE COMPONENT
================================ */

export default function TenderExecutivePerformance() {
    const [userId, setUserId] = useState<number | null>();
    const [fromDate, setFromDate] = useState<string | null>();
    const [toDate, setToDate] = useState<string | null>();
    const [selectedMetric, setSelectedMetric] = useState<TenderKpiKey | null>(null);
    const navigate = useNavigate();

    const { data: users } = useUsersByRole(5);

    const query = { userId, fromDate, toDate };

    const { data: summary } = usePerformanceSummary(query);
    const { data: outcomes } = usePerformanceOutcomes(query);
    const { data: stageMatrix } = useStageMatrix(query);
    const { data: trends = [] } = usePerformanceTrends(query);
    const { data: scoring } = useExecutiveScoring(query);

    const STAGES = stageMatrix?.stages ?? [];
    const STAGE_MATRIX = stageMatrix?.rows ?? [];

    console.log({ "kpi data": outcomes });

    // console.log("TENDERS:", tenders);

    const SCORING_COLORS: Record<ScoringKey, string> = {
        "Work Completion": "#6366F1",
        "On Time Work": "#22C55E",
        "Win Rate": "#F59E0B",
    };

    const SCORING_DATA = scoring
        ? [
              { name: "Work Completion", score: scoring.workCompletion },
              { name: "On Time Work", score: scoring.onTimeWork },
              { name: "Win Rate", score: scoring.winRate },
          ].map(item => ({
              ...item,
              fill: SCORING_COLORS[item.name as keyof typeof SCORING_COLORS],
          }))
        : [];

    const totalScore = scoring?.total ?? (SCORING_DATA.length ? Math.round(SCORING_DATA.reduce((sum, item) => sum + item.score, 0) / SCORING_DATA.length) : 0);

    const PRE_BID_KPIS = useMemo(() => {
        if (!outcomes) return [];

        return [
            {
                key: "ALLOCATED",
                label: "Allocated",
                count: outcomes.allocated,
                icon: Briefcase,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
            },
            {
                key: "APPROVED",
                label: "Approved",
                count: outcomes.approved,
                icon: CheckCircle2,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
            {
                key: "REJECTED",
                label: "Rejected",
                count: outcomes.rejected,
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-50",
            },
            {
                key: "PENDING",
                label: "Pending",
                count: outcomes.pending,
                icon: Clock,
                color: "text-amber-600",
                bg: "bg-amber-50",
            },
        ];
    }, [outcomes]);

    const POST_BID_KPIS = useMemo(() => {
        if (!outcomes) return [];

        return [
            {
                key: "BID",
                label: "Bid",
                count: outcomes.bid,
                icon: FileText,
                color: "text-sky-600",
                bg: "bg-sky-50",
            },
            {
                key: "MISSED",
                label: "Missed",
                count: outcomes.missed,
                icon: AlertTriangle,
                color: "text-rose-600",
                bg: "bg-rose-50",
            },
            {
                key: "DISQUALIFIED",
                label: "Disqualified",
                count: outcomes.disqualified,
                icon: AlertTriangle,
                color: "text-orange-600",
                bg: "bg-orange-50",
            },
            {
                key: "RESULT_AWAITED",
                label: "Result Awaited",
                count: outcomes.resultAwaited,
                icon: FileText,
                color: "text-blue-600",
                bg: "bg-blue-50",
            },
            {
                key: "LOST",
                label: "Lost",
                count: outcomes.lost,
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-50",
            },
            {
                key: "WON",
                label: "Won",
                count: outcomes.won,
                icon: Trophy,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
        ];
    }, [outcomes]);

    const tenders = useMemo(() => {
        const tendersByKpi = outcomes?.tendersByKpi;

        if (!tendersByKpi) return [];

        // ALL view → deduplicated
        if (!selectedMetric) {
            const map = new Map<number, (typeof tendersByKpi)[TenderKpiKey][number]>();

            Object.values(tendersByKpi).forEach(list => {
                list.forEach(tender => {
                    if (!map.has(tender.id)) {
                        map.set(tender.id, tender);
                    }
                });
            });

            return Array.from(map.values());
        }

        return tendersByKpi[selectedMetric] ?? [];
    }, [outcomes, selectedMetric]);

    const renderKpiCard = kpi => {
        const isSelected = selectedMetric === kpi.key;

        return (
            <button
                key={kpi.key}
                onClick={() => setSelectedMetric(kpi.key)}
                className={`
                group relative overflow-hidden
                flex flex-col
                p-5 rounded-2xl border
                transition-all duration-300 ease-out
                hover:-translate-y-1 hover:shadow-xl
                ${
                    isSelected
                        ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/40 ring-2 ring-primary/50"
                        : "bg-card/80 backdrop-blur border-border hover:border-primary/30"
                }
            `}
            >
                {/* Glow Accent */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

                {/* KPI Row */}
                <div className="relative flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${kpi.bg} shadow-sm`}>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>

                    <span className="text-[11px] tracking-wide font-semibold text-muted-foreground uppercase whitespace-nowrap">{kpi.label}</span>

                    <span className="ml-auto text-2xl font-bold tracking-tight">{kpi.count}</span>
                </div>

                {/* Selection Bar */}
                {isSelected && <div className="absolute bottom-0 left-0 h-1 w-full bg-primary rounded-t-full" />}
            </button>
        );
    };
    return (
        <div className="min-h-screen bg-muted/10 pb-12">
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                {/* ===== HEADER & FILTERS ===== */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Performance Report</h1>
                        <p className="text-muted-foreground mt-1">Analyze tender outcomes, stage velocity, and executive scoring.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team Member</label>
                                <Select value={userId ? userId.toString() : undefined} onValueChange={v => setUserId(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select User" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users?.map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                {u.name} {u?.team}
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
                        </div>
                    </CardContent>
                </Card>

                {/* ===== STAGE BACKLOG ===== */}
                <StageBacklogTable userId={userId} fromDate={fromDate} toDate={toDate} />

                {/* ===== EMD BACKLOG ===== */}
                <EmdBalanceTable userId={userId} fromDate={fromDate} toDate={toDate} />

                {/* ===== KPI CARDS ===== */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">Pre-Bid</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{PRE_BID_KPIS.map(renderKpiCard)}</div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">Post-Bid</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{POST_BID_KPIS.map(renderKpiCard)}</div>
                    </div>
                </div>

                {/* ===== TENDER LIST TABLE ===== */}
                <Card className="shadow-sm border-0 ring-1 ring-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {[...PRE_BID_KPIS, ...POST_BID_KPIS].find(k => k.key === selectedMetric)?.label ?? "All"} Tenders
                                <Badge variant="secondary">{tenders.length}</Badge>
                            </CardTitle>
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
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenders.map(tender => (
                                    <TableRow key={tender.id}>
                                        <TableCell className="font-medium text-muted-foreground">{tender.tenderNo}</TableCell>
                                        <TableCell>{tender.organizationName}</TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={tender.tenderName}>
                                            {tender.tenderName}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(tender.value)}</TableCell>
                                        <TableCell>
                                            <Badge variant={tender.status === "Won" ? "default" : tender.status === "Lost" ? "destructive" : "secondary"}>{tender.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(paths.tendering.tenderView(tender.id))}>
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* ===== STAGE MATRIX / KANBAN METRICS ===== */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                Stage Efficiency Matrix
                            </h2>
                            <p className="text-sm text-muted-foreground">Detailed breakdown of tender counts per stage and status.</p>
                        </div>
                    </div>

                    <Card className="shadow-sm border-0 ring-1 ring-border/50 overflow-hidden pt-0 mt-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[1000px] border-collapse">
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-muted/30 border-b border-border/60">
                                        <TableHead className="w-[150px] font-bold text-foreground bg-muted/30 sticky left-0 z-10 border-r">Metric / Stage</TableHead>
                                        {STAGES.map((stage, i) => (
                                            <TableHead key={i} className="text-center text-xs uppercase font-semibold text-muted-foreground w-[90px]">
                                                <div className="flex items-center justify-center gap-1">
                                                    {formatLabel(stage)}
                                                    {/* <Tooltip>
                                                        <TooltipTrigger>
                                                            <Info className="h-3 w-3 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs max-w-xs">{STAGE_HELP_TEXT[stage] ?? "No description available"}</p>
                                                        </TooltipContent>
                                                    </Tooltip> */}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {STAGE_MATRIX.map((row, i) => {
                                        const rowType = STAGE_ROW_TYPE_MAP[row.key];
                                        return (
                                            <TableRow
                                                key={i}
                                                className={`
                                            ${row.label === "Approved" ? "bg-primary/5" : ""} 
                                            hover:bg-muted/20
                                        `}
                                            >
                                                <TableCell
                                                    className={`
                                                font-semibold sticky left-0 z-10 border-r bg-background
                                                ${rowType === "info" ? "text-primary" : ""}
                                                ${rowType === "success" ? "text-emerald-600" : ""}
                                                ${rowType === "warning" ? "text-amber-600" : ""}
                                                ${rowType === "destructive" ? "text-destructive" : ""}
                                            `}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {row.label}
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Info className="h-3 w-3 text-muted-foreground" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">{ROW_HELP_TEXT[row.key] ?? ""}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                                {row.data.map((val, j) => (
                                                    <TableCell key={j} className="text-center p-2">
                                                        {val !== null ? (
                                                            (() => {
                                                                const drilldown = (row as any).drilldown?.[j] ?? [];

                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div
                                                                                className={`
                                                                                mx-auto flex items-center justify-center w-8 h-8 rounded-full text-sm cursor-pointer font-bold
                                                                                ${rowType === "success" ? "bg-emerald-100/70 text-emerald-700" : ""}   // onTime
                                                                                ${rowType === "completed" ? "bg-green-100/70 text-green-700" : ""}    // done
                                                                                ${rowType === "warning" ? "bg-amber-100/70 text-amber-700" : ""}      // late
                                                                                ${rowType === "info" ? "bg-sky-100/70 text-sky-700" : ""}             // pending
                                                                                ${rowType === "destructive" ? "bg-destructive/10 text-destructive" : ""} // overdue
                                                                                ${rowType === "default" ? "bg-muted text-muted-foreground" : ""}   // notApplicable
                                                                            `}
                                                                            >
                                                                                {val}
                                                                            </div>
                                                                        </PopoverTrigger>

                                                                        <PopoverContent className="w-80 max-h-72 overflow-auto">
                                                                            <div className="space-y-2">
                                                                                <div className="font-semibold text-sm">
                                                                                    {row.label} — {formatLabel(STAGES[j])}
                                                                                </div>

                                                                                {drilldown.length === 0 ? (
                                                                                    <p className="text-xs text-muted-foreground">No tenders</p>
                                                                                ) : (
                                                                                    drilldown.map((t: any) => (
                                                                                        <div key={t.tenderId} className="border-b pb-2 text-xs space-y-1">
                                                                                            <div className="font-medium">{t.tenderNo ?? `Tender #${t.tenderId}`}</div>

                                                                                            {t.tenderName && <div className="text-muted-foreground truncate">{t.tenderName}</div>}

                                                                                            {t.deadline && (
                                                                                                <div className="text-muted-foreground">
                                                                                                    Due: {new Date(t.deadline).toLocaleDateString()}
                                                                                                </div>
                                                                                            )}

                                                                                            {t.daysOverdue !== null && (
                                                                                                <div className="text-red-600 font-medium">{t.daysOverdue} days overdue</div>
                                                                                            )}

                                                                                            {t.meta && Object.keys(t.meta).length > 0 && (
                                                                                                <div className="italic text-muted-foreground">
                                                                                                    {Object.entries(t.meta)
                                                                                                        .map(([k, v]) => `${k}: ${v}`)
                                                                                                        .join(", ")}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })()
                                                        ) : (
                                                            <span className="text-muted-foreground/20 text-xl">·</span>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    })}

                                    {/* Summary Percentages */}
                                    {/* {summary.map((row, i) => (
                                        <TableRow key={`sum-${i}`} className="bg-muted/10 border-t-2 border-border/50">
                                            <TableCell className="font-medium text-xs uppercase tracking-wide text-muted-foreground sticky left-0 z-10 border-r bg-muted/10">
                                                {row.label}
                                            </TableCell>
                                            {row.data.map((val, j) => (
                                                <TableCell key={j} className="text-center text-xs font-medium text-muted-foreground">
                                                    {val || "-"}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))} */}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {/* ===== METRICS & SCORING (Side by Side) ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Performance Trends */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        Performance Trends
                                    </CardTitle>
                                    <CardDescription>Completion rate vs On-time rate over the last 5 periods</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                        <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="completion" name="Completion %" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="onTime" name="On-Time %" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="p-3 bg-muted/20 rounded-lg text-center">
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Avg Completion</div>
                                    <div className="text-xl font-bold text-foreground"> {summary?.completionRate ?? 0}%</div>
                                    {/* <div className="text-xs text-rose-500 font-medium">-2% vs Target</div> */}
                                </div>
                                <div className="p-3 bg-muted/20 rounded-lg text-center">
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Avg On-Time</div>
                                    <div className="text-xl font-bold text-foreground">{summary?.onTimeRate ?? 0}%</div>
                                    {/* <div className="text-xs text-emerald-500 font-medium">+4% vs Target</div> */}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Executive Scoring */}
                    <Card className="shadow-sm border-0 ring-1 ring-border/50 h-full">
                        <CardHeader>
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Executive Scoring
                                </CardTitle>
                                <CardDescription>Weighted scores based on Work Completion, On Time Work and Win Rate</CardDescription>
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
                                            {/* <span className="font-semibold text-lg">Total Score</span> */}
                                            {/* <Badge variant="default" className="text-lg px-3 py-1">
                                                {totalScore}
                                            </Badge> */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
