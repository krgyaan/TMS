import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Bot,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import { useClaudeTenders } from '@/hooks/api/useHealth';
import { paths } from '@/app/routes/paths';

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

function formatCallType(callType: string): string {
    if (!callType) return 'Unknown';
    return callType
        .split('_')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function CallTypeBadge({ callType }: { callType: string }) {
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
    if (callType === 'bidding_requirements') {
        return (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[11px]">
                Requirement Analysis
            </Badge>
        );
    }
    if (callType === 'main_extraction') {
        return (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[11px]">
                Main Extraction
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="border-muted-foreground/30 bg-muted text-muted-foreground text-[11px]">
            {formatCallType(callType)}
        </Badge>
    );
}

export default function TenderCostsPage() {
    const [tenderSortBy, setTenderSortBy] = useState<'cost' | 'tokens' | 'recent'>('cost');
    const { data: tendersData, isLoading: tendersLoading, refetch: refetchTenders, isFetching } = useClaudeTenders(tenderSortBy);
    const [expandedTenders, setExpandedTenders] = useState<Record<number, boolean>>({});

    const toggleTenderExpand = (tenderId: number) => {
        setExpandedTenders((prev) => ({
            ...prev,
            [tenderId]: !prev[tenderId],
        }));
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header with back navigation */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                        <Link to={paths.system.health}>
                            <ArrowLeft className="h-4 w-4" />
                            Back to System Health
                        </Link>
                    </Button>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchTenders()}
                    disabled={isFetching}
                    className="h-8 gap-1.5 text-xs self-start sm:self-auto"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Main Tender Token & Cost Breakdown Card */}
            <Card className="gap-0">
                <CardHeader className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm font-semibold">Tender Token & Cost Breakdown</CardTitle>
                                <Badge variant="secondary" className="text-[10px]">
                                    All-time
                                </Badge>
                            </div>
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
