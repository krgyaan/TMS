import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* Custom Hooks */
import { useLocationPerformance } from "@/hooks/api/useLocationPerformance";
import type { LocationPerformanceParams } from "../helpers/location-performance.types";

const SERIES = [
    { key: "won", label: "Won", color: "#16a34a" },
    { key: "bid", label: "Bid", color: "#2563eb" },
    { key: "results_awaited", label: "Results Awaited", color: "#8b5cf6" },
    { key: "missed", label: "Missed", color: "#f59e0b" },
    { key: "disqualified", label: "Disqualified", color: "#f97316" },
    { key: "lost", label: "Lost", color: "#dc2626" },
    { key: "assigned", label: "Assigned", color: "#64748b" },
    { key: "approved", label: "Approved", color: "#0ea5e9" },
] as const;

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

    const total = payload.reduce((sum, entry) => sum + (typeof entry.value === "number" ? entry.value : 0), 0);

    return (
        <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
            <p className="mb-1 font-medium">{label}</p>
            {payload.map(entry => (
                <p key={String(entry.dataKey)} className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="ml-auto font-medium tabular-nums">{entry.value}</span>
                </p>
            ))}
            <p className="mt-1 flex items-center gap-2 border-t pt-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-auto font-semibold tabular-nums">{total}</span>
            </p>
        </div>
    );
}

interface LocationBarChartProps {
    params: LocationPerformanceParams | null;
}

export default function LocationBarChart({ params }: LocationBarChartProps) {
    const { data, isLoading } = useLocationPerformance(params);

    const summary = data?.summary;

    const rows = useMemo(
        () =>
            summary
                ? [
                      { label: "Assigned", assigned: summary.tenders_assigned.count },
                      { label: "Approved", approved: summary.tenders_approved.count },
                      { label: "Bid", bid: summary.tenders_bid.count },
                      { label: "Missed", missed: summary.tenders_missed.count },
                      { label: "Disqualified", disqualified: summary.tenders_disqualified.count },
                      { label: "Results Awaited", results_awaited: summary.tender_results_awaited.count },
                      { label: "Won", won: summary.tenders_won.count },
                      { label: "Lost", lost: summary.tenders_lost.count },
                  ]
                : [],
        [summary]
    );

    if (!params) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[360px] w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    const hasData = rows.length > 0 && rows.some(r => Object.values(r).some(v => typeof v === "number" && v > 0));

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Tender Count by Category</CardTitle>
                <CardDescription>Number of tenders in each category.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                {!hasData ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No data available for the selected filters.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} width={44} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                            <Legend />
                            {SERIES.map(s => (
                                <Bar key={s.key} dataKey={s.key} name={s.label} stackId="status" fill={s.color} radius={[2, 2, 0, 0]} maxBarSize={48} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
