import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import type { OemPerformanceParams } from "../helpers/oem-performance.types";

const SERIES = [
    { key: "won", label: "Won", color: "#16a34a" },
    { key: "missed", label: "Missed", color: "#f59e0b" },
    { key: "lost", label: "Lost", color: "#dc2626" },
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

interface TenderCountBarChartProps {
    params: OemPerformanceParams | null;
}

export default function TenderCountBarChart({ params }: TenderCountBarChartProps) {
    const { data, isLoading } = useOemPerformance(params);

    const rows = useMemo(
        () =>
            (data?.monthlyTrend ?? []).map(point => ({
                label: point.label,
                won: point.won,
                missed: point.missed,
                lost: point.lost,
            })),
        [data]
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

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Tenders per Month</CardTitle>
                <CardDescription>Number of tenders per month, split by won, missed and lost.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                {rows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No monthly data available for the selected filters.</div>
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
