import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import type { OemPerformanceParams } from "../helpers/oem-performance.types";

interface DonutSlice {
    name: string;
    value: number;
    color: string;
}

interface TooltipEntry {
    name?: string;
    value?: number | string;
    payload?: DonutSlice;
}

interface ChartTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    total: number;
}

function ChartTooltip({ active, payload, total }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const entry = payload[0];
    const value = typeof entry.value === "number" ? entry.value : 0;
    const pct = total > 0 ? (value / total) * 100 : 0;

    return (
        <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
            <p className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.payload?.color }} />
                <span className="font-medium">{entry.name}</span>
            </p>
            <p className="mt-1 flex items-center gap-3">
                <span className="text-muted-foreground">Count:</span>
                <span className="font-medium tabular-nums">{value}</span>
                <span className="text-muted-foreground">Share:</span>
                <span className="font-medium tabular-nums">{pct.toFixed(1)}%</span>
            </p>
        </div>
    );
}

interface DonutChartPerformanceProps {
    params: OemPerformanceParams | null;
}

export default function DonutChartPerformance({ params }: DonutChartPerformanceProps) {
    const { data, isLoading } = useOemPerformance(params);

    const summary = data?.summary;
    const total = summary?.totalTendersWithOem ?? 0;

    const slices = useMemo<DonutSlice[]>(() => {
        if (!summary) return [];
        return [
            { name: "Won", value: summary.tendersWon, color: "#16a34a" },
            { name: "Bid", value: summary.tendersSubmitted, color: "#2563eb" },
            { name: "Lost", value: summary.tendersLost, color: "#dc2626" },
            { name: "Not Allowed", value: summary.tendersNotAllowed, color: "#64748b" },
        ];
    }, [summary]);

    const hasData = slices.some(slice => slice.value > 0);

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
                <CardTitle className="text-base font-semibold">Tender Outcome Split</CardTitle>
                <CardDescription>Share of tenders by win, bid, lost and not-allowed status.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                {!hasData ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No data available for the selected filters.</div>
                ) : (
                    <div className="relative">
                        <ResponsiveContainer width="100%" height={360}>
                            <PieChart>
                                <Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
                                    {slices.map(slice => (
                                        <Cell key={slice.name} fill={slice.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip total={total} />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-9 flex flex-col items-center justify-center">
                            <span className="text-2xl font-semibold tabular-nums">{total}</span>
                            <span className="text-xs text-muted-foreground">Total Tenders</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
