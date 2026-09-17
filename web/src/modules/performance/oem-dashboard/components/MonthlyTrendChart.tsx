import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import type { OemPerformanceParams } from "../helpers/oem-performance.types";

type StatusKey = "won" | "missed" | "lost";

const STATUS_META: { key: StatusKey; label: string; color: string }[] = [
    { key: "won", label: "Won", color: "#16a34a" },
    { key: "missed", label: "Missed", color: "#f59e0b" },
    { key: "lost", label: "Lost", color: "#dc2626" },
];

/** Least-squares line over evenly spaced x (0..n-1) — returns fitted y values. */
function linearRegression(values: number[]): number[] {
    const n = values.length;
    if (n === 0) return [];
    if (n === 1) return [values[0]];

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumXX += i * i;
    }

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return values.map(() => sumY / n);

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return values.map((_, i) => intercept + slope * i);
}

interface ChartRow {
    label: string;
    won: number;
    missed: number;
    lost: number;
    total: number;
    trend: number;
}

interface TooltipEntry {
    dataKey?: string | number;
    name?: string;
    value?: number | string;
    color?: string;
}

interface ChartTooltipProps {
    active?: boolean;
    label?: string | number;
    payload?: TooltipEntry[];
}

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
            <p className="mb-1 font-medium">{label}</p>
            {payload
                .filter(entry => entry.dataKey !== "trend")
                .map(entry => (
                    <p key={String(entry.dataKey)} className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="ml-auto font-medium tabular-nums">{entry.value}</span>
                    </p>
                ))}
        </div>
    );
}

interface MonthlyTrendChartProps {
    params: OemPerformanceParams | null;
}

export default function MonthlyTrendChart({ params }: MonthlyTrendChartProps) {
    const { data, isLoading } = useOemPerformance(params);
    const [selected, setSelected] = useState<StatusKey[]>(["won", "missed", "lost"]);

    const points = useMemo(() => data?.monthlyTrend ?? [], [data]);

    const toggleStatus = (key: StatusKey) => setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

    const rows = useMemo<ChartRow[]>(() => {
        const totals = points.map(p => selected.reduce((sum, k) => sum + (p[k] ?? 0), 0));
        const fitted = linearRegression(totals);

        return points.map((p, i) => ({
            label: p.label,
            won: p.won,
            missed: p.missed,
            lost: p.lost,
            total: totals[i],
            trend: fitted[i] ?? 0,
        }));
    }, [points, selected]);

    if (!params) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[420px] w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-semibold">Monthly Tender Trend</CardTitle>
                        <CardDescription>Won, missed and lost tender counts per month with an overall linear trendline.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {STATUS_META.map(s => {
                            const active = selected.includes(s.key);
                            return (
                                <Button key={s.key} type="button" size="sm" variant={active ? "secondary" : "outline"} className="gap-1.5" onClick={() => toggleStatus(s.key)}>
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{
                                            backgroundColor: active ? s.color : "transparent",
                                            border: `1px solid ${s.color}`,
                                        }}
                                    />
                                    {s.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {points.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No monthly data available for the selected filters.</div>
                ) : selected.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">Select at least one status to display the chart.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={420}>
                        <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                            <defs>
                                {STATUS_META.map(s => (
                                    <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={s.color} stopOpacity={0.55} />
                                        <stop offset="95%" stopColor={s.color} stopOpacity={0.08} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} width={44} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend />
                            {STATUS_META.filter(s => selected.includes(s.key)).map(s => (
                                <Area
                                    key={s.key}
                                    type="monotone"
                                    dataKey={s.key}
                                    name={s.label}
                                    stackId="status"
                                    stroke={s.color}
                                    strokeWidth={2}
                                    fill={`url(#area-${s.key})`}
                                    activeDot={{ r: 4 }}
                                />
                            ))}
                            <Line type="linear" dataKey="trend" name="Trend" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
