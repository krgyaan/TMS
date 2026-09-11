import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import {
    Bot,
    Sparkles,
    Coins,
    Users,
    Activity,
    Search,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    RefreshCw,
} from 'lucide-react';
import { useClaudeTelemetry, useClaudeTenders } from '@/hooks/api/useHealth';
import { paths } from '@/app/routes/paths';
import { Link } from 'react-router-dom';

function relativeTime(value?: string | null): string {
    if (!value) return '—';
    const ms = Date.now() - Date.parse(value);
    if (Number.isNaN(ms)) return '—';
    const s = Math.floor(ms / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatInr(value?: number | null): string {
    return inrFormatter.format(value ?? 0);
}

function getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CallTypeBadge({ callType }: { callType: string }) {
    if (callType === 'missing_field_fallback') {
        return (
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 text-[11px]">
                Role 1: Missing Fields
            </Badge>
        );
    }
    if (callType === 'ambiguity_resolution') {
        return (
            <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 text-[11px]">
                Role 2: Ambiguity Review
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[11px]">
            Main Extraction
        </Badge>
    );
}

export function ClaudeTelemetrySection() {
    const { data: telemetry, error, refetch, isFetching } = useClaudeTelemetry();
    const [tenderSortBy, setTenderSortBy] = useState<'cost' | 'tokens' | 'recent'>('cost');
    const { data: tendersData, isLoading: tendersLoading, refetch: refetchTenders } = useClaudeTenders(tenderSortBy);

    const [userFilter, setUserFilter] = useState('');
    const [expandedTenders, setExpandedTenders] = useState<Record<number, boolean>>({});

    const toggleTenderExpand = (tenderId: number) => {
        setExpandedTenders((prev) => ({
            ...prev,
            [tenderId]: !prev[tenderId],
        }));
    };

    if (error) {
        const isAuthError = (error as any)?.response?.status === 403 || (error as any)?.response?.status === 401;
        return (
            <Card className="border-border">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Claude AI Token Telemetry & Cost</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {isAuthError ? (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700">
                            <div className="flex items-center gap-2 font-medium">
                                <ShieldCheck className="h-4 w-4" />
                                Admin-Restricted Telemetry
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Per-user token consumption and Claude API billing metrics are restricted to Admin & Super User accounts.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
                            Failed to load Claude telemetry: {(error as Error).message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-3">
                                Retry
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    const summary = telemetry?.summary;
    const reconciliation = telemetry?.reconciliation;
    const timeline = telemetry?.timeline || [];
    const rawUsers = telemetry?.userBreakdown || [];

    const filteredUsers = rawUsers.filter(
        (u) =>
            u.name.toLowerCase().includes(userFilter.toLowerCase()) ||
            u.email.toLowerCase().includes(userFilter.toLowerCase()),
    );

    const maxUserTokens = Math.max(...rawUsers.map((u) => u.totalTokens), 1);

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-background text-foreground shadow-xs">
                        <Bot className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold tracking-tight">Claude AI Token Telemetry & Diagnostics</h2>
                            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600">
                                Claude Haiku 4.5 & Sonnet 5
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Real-time sliding-window TPM rate, per-user token allocation, and per-tender cost breakdown
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`inline-flex h-2 w-2 rounded-full bg-emerald-500 ${isFetching ? 'animate-ping' : ''}`} />
                        Auto-refresh 15s
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            refetch();
                            refetchTenders();
                        }}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Admin API Cross-Check Reconciliation Card */}
            {reconciliation && (
                <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <span>Anthropic Admin API Cross-Check</span>
                                    {reconciliation.status === 'matched' && (
                                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]">
                                            <CheckCircle2 className="mr-1 h-3 w-3" /> Matched
                                        </Badge>
                                    )}
                                    {reconciliation.status === 'drift_detected' && (
                                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]">
                                            <AlertTriangle className="mr-1 h-3 w-3" /> Drift Detected
                                        </Badge>
                                    )}
                                    {reconciliation.status === 'unconfigured' && (
                                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                            Unverified (Admin Key Not Set)
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">{reconciliation.message}</p>
                            </div>
                        </div>

                        {reconciliation.anthropicVerifiedTokens != null && (
                            <div className="flex items-center gap-6 text-xs">
                                <div>
                                    <span className="text-muted-foreground">App-Tracked: </span>
                                    <span className="font-semibold text-foreground">
                                        {reconciliation.appTrackedTokens.toLocaleString()} tok
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Anthropic-Verified: </span>
                                    <span className="font-semibold text-foreground">
                                        {reconciliation.anthropicVerifiedTokens.toLocaleString()} tok
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Variance: </span>
                                    <span
                                        className={`font-semibold ${
                                            reconciliation.driftPercent && reconciliation.driftPercent > 5
                                                ? 'text-amber-600'
                                                : 'text-emerald-600'
                                        }`}
                                    >
                                        {reconciliation.driftPercent}% ({reconciliation.deltaTokens?.toLocaleString()} tok)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4 Hero Metric Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {/* 1. Tokens Per Minute */}
                <Card className="gap-2 p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                            <Activity className="h-4 w-4 text-emerald-500" />
                            Tokens Per Minute
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                            Sliding 60s
                        </Badge>
                    </div>
                    <div>
                        <div className="text-2xl font-bold tracking-tight">
                            {summary ? summary.currentTpm.toLocaleString() : '0'}{' '}
                            <span className="text-xs font-normal text-muted-foreground">TPM</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{summary?.tpmUtilizationPct ?? 0}% of tier limit</span>
                            <span>80k max</span>
                        </div>
                        <Progress value={Math.min(100, summary?.tpmUtilizationPct ?? 0)} className="mt-1.5 h-1.5" />
                    </div>
                </Card>

                {/* 2. Total Tokens Consumed */}
                <Card className="gap-2 p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            Total Tokens Consumed
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold tracking-tight">
                            {summary ? summary.totalTokens.toLocaleString() : '0'}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>In: {(summary?.inputTokens ?? 0).toLocaleString()}</span>
                            <span>•</span>
                            <span>Out: {(summary?.outputTokens ?? 0).toLocaleString()}</span>
                            <span>•</span>
                            <span>Cache: {(summary?.cacheTokens ?? 0).toLocaleString()}</span>
                        </div>
                    </div>
                </Card>

                {/* 3. Active Users & Requests */}
                <Card className="gap-2 p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                            <Users className="h-4 w-4 text-blue-500" />
                            Active Users
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold tracking-tight">
                            {summary?.activeUsersCount ?? 0}{' '}
                            <span className="text-xs font-normal text-muted-foreground">users</span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {summary?.totalRequests ?? 0} extraction passes completed
                        </div>
                    </div>
                </Card>

                {/* 4. Estimated Total Cost */}
                <Card className="gap-2 p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                            <Coins className="h-4 w-4 text-amber-500" />
                            Estimated Total Cost
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold tracking-tight text-emerald-600">
                            {formatInr(summary?.estimatedCostInr)}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                            ${summary ? summary.estimatedCostUsd.toFixed(4) : '0.0000'} USD
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            Haiku 4.5 ($1.00/M) · Sonnet 5 ($2.00/M)
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground/80">
                            @ ₹{summary?.currency?.usdToInrRate ?? '—'}/USD (rate as of {summary?.currency?.usdToInrRateAsOf ?? 'unknown'} — update periodically)
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tokens Per Minute Real-time Chart */}
            <Card className="gap-0">
                <CardHeader className="px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-semibold">Tokens Per Minute Velocity (Last 60 Minutes)</CardTitle>
                        </div>
                        <div className="text-xs text-muted-foreground">Resolution: 1-minute buckets</div>
                    </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="tpmGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="minute"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={11}
                                    tickLine={false}
                                    interval={5}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                                <RechartsTooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload as any;
                                            return (
                                                <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs">
                                                    <div className="font-semibold text-foreground">{label}</div>
                                                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                                                        <div>
                                                            Total Tokens:{' '}
                                                            <span className="font-semibold text-foreground">
                                                                {d.tokens.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div>Input: {d.inputTokens?.toLocaleString()}</div>
                                                        <div>Output: {d.outputTokens?.toLocaleString()}</div>
                                                        <div>Requests: {d.requests}</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tokens"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#tpmGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Per-User Token Leaderboard Table */}
            <Card className="gap-0">
                <CardHeader className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-semibold">User Token Consumption Leaderboard</CardTitle>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search user name or email..."
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="h-8 pl-8 text-xs"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">User</TableHead>
                                    <TableHead className="text-xs">Total Tokens</TableHead>
                                    <TableHead className="text-xs">Share</TableHead>
                                    <TableHead className="text-xs">In / Out</TableHead>
                                    <TableHead className="text-xs">Requests</TableHead>
                                    <TableHead className="text-xs">Cost (₹ / $)</TableHead>
                                    <TableHead className="text-xs text-right">Last Active</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                                            No user token activity recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const sharePct = Math.round((u.totalTokens / maxUserTokens) * 100);
                                        return (
                                            <TableRow key={u.userId}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                                                            {getInitials(u.name)}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-medium text-foreground">{u.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-xs">
                                                    {u.totalTokens.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="w-32">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={sharePct} className="h-1.5 w-16" />
                                                        <span className="text-[10px] text-muted-foreground">{sharePct}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {u.inputTokens.toLocaleString()} / {u.outputTokens.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs">{u.requests}</TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium text-emerald-600">{formatInr(u.estimatedCostInr)}</div>
                                                    <div className="text-[10px] text-muted-foreground">${u.estimatedCostUsd.toFixed(4)}</div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground">
                                                    {relativeTime(u.lastActiveAt)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* NEW REQUIREMENT: Per-Tender Token & Cost Breakdown */}
            <Card className="gap-0">
                <CardHeader className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold">Tender Token & Cost Breakdown</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Detailed token usage and dollar cost grouped by tender, expandable by pipeline stage
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground mr-1">Sort by:</span>
                            <Button
                                variant={tenderSortBy === 'cost' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTenderSortBy('cost')}
                            >
                                Cost
                            </Button>
                            <Button
                                variant={tenderSortBy === 'tokens' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTenderSortBy('tokens')}
                            >
                                Tokens
                            </Button>
                            <Button
                                variant={tenderSortBy === 'recent' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTenderSortBy('recent')}
                            >
                                Recent
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead className="text-xs">Tender ID</TableHead>
                                    <TableHead className="text-xs">Total Tokens</TableHead>
                                    <TableHead className="text-xs">Total Cost (₹ / $)</TableHead>
                                    <TableHead className="text-xs">Calls Count</TableHead>
                                    <TableHead className="text-xs">Last Extracted</TableHead>
                                    <TableHead className="text-xs text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tendersLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                                            Loading tender breakdown…
                                        </TableCell>
                                    </TableRow>
                                ) : !tendersData || tendersData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                                            No tender extractions recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tendersData.map((item) => {
                                        const isExpanded = !!expandedTenders[item.tenderId];
                                        return (
                                            <React.Fragment key={item.tenderId}>
                                                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleTenderExpand(item.tenderId)}>
                                                    <TableCell className="p-2 text-center">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-xs">
                                                        Tender #{item.tenderId}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {item.totalTokens.toLocaleString()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-semibold text-emerald-600">{formatInr(item.estimatedCostInr)}</div>
                                                        <div className="text-[10px] text-muted-foreground">${item.estimatedCostUsd.toFixed(4)}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{item.totalCalls} pass(es)</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {relativeTime(item.lastActiveAt)}
                                                    </TableCell>
                                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                        <Link
                                                            to={paths.tendering.infoSheetEdit(item.tenderId)}
                                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                        >
                                                            View Info Sheet <ExternalLink className="h-3 w-3" />
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expandable breakdown by stage / call */}
                                                {isExpanded && (
                                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                        <TableCell colSpan={7} className="p-3 pl-10">
                                                            <div className="rounded-md border bg-background p-3">
                                                                <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                                    Stage Breakdown for Tender #{item.tenderId}
                                                                </div>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="border-b">
                                                                            <TableHead className="text-[11px] h-7">Stage / Call Type</TableHead>
                                                                            <TableHead className="text-[11px] h-7">Model</TableHead>
                                                                            <TableHead className="text-[11px] h-7">Input</TableHead>
                                                                            <TableHead className="text-[11px] h-7">Output</TableHead>
                                                                            <TableHead className="text-[11px] h-7">Total</TableHead>
                                                                            <TableHead className="text-[11px] h-7">Cost (₹ / $)</TableHead>
                                                                            <TableHead className="text-[11px] h-7">Duration</TableHead>
                                                                            <TableHead className="text-[11px] h-7 text-right">Timestamp</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {item.calls.map((c) => (
                                                                            <TableRow key={c.id} className="text-xs">
                                                                                <TableCell className="py-1.5">
                                                                                    <CallTypeBadge callType={c.callType} />
                                                                                </TableCell>
                                                                                <TableCell className="py-1.5 text-muted-foreground text-[11px]">
                                                                                    {c.model}
                                                                                </TableCell>
                                                                                <TableCell className="py-1.5">{c.inputTokens.toLocaleString()}</TableCell>
                                                                                <TableCell className="py-1.5">{c.outputTokens.toLocaleString()}</TableCell>
                                                                                <TableCell className="py-1.5 font-semibold">
                                                                                    {c.totalTokens.toLocaleString()}
                                                                                </TableCell>
                                                                                <TableCell className="py-1.5">
                                                                                    <div className="text-emerald-600 font-medium">{formatInr(c.estimatedCostInr)}</div>
                                                                                    <div className="text-[10px] text-muted-foreground">${c.estimatedCostUsd.toFixed(4)}</div>
                                                                                </TableCell>
                                                                                <TableCell className="py-1.5 text-muted-foreground">
                                                                                    {c.durationMs ? `${c.durationMs}ms` : '—'}
                                                                                </TableCell>
                                                                                <TableCell className="py-1.5 text-right text-muted-foreground">
                                                                                    {new Date(c.createdAt).toLocaleTimeString([], {
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit',
                                                                                        second: '2-digit',
                                                                                    })}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
