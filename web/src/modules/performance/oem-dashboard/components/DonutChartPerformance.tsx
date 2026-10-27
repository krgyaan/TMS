import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts";

/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { OemComponentData } from "../helpers/oem-performance.types";

// NOTE: `type` (not `interface`) so it gets an implicit index signature and is
// assignable to Recharts' `Pie` data type (`ChartDataInput` = Record<string, unknown>).
type DonutSlice = {
    name: string;
    value: number;
    color: string;
};

// `percent` below is computed by Recharts (value / total) for each sector, so
// the label can never be a stale/zero value the way the old `LabelList`
// `dataKey` path was producing.
const RADIAN = Math.PI / 180;

// Percentage-only label, drawn at the mid-radius of the slice. Slices below
// 1.5% are skipped so their text does not overlap neighbours (hover still
// shows the exact count + share).
function renderSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) {
    const share = (percent ?? 0) * 100;
    if (share < 1.5) return null;

    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) / 2;
    const angle = (midAngle ?? 0) * RADIAN;
    const x = Number(cx) + radius * Math.cos(-angle);
    const y = Number(cy) + radius * Math.sin(-angle);

    return (
        <text x={x} y={y} fill="#fff" fontSize={11} textAnchor="middle" dominantBaseline="middle">
            {`${share.toFixed(1)}%`}
        </text>
    );
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
    data: OemComponentData | undefined;
    isLoading: boolean;
}

export default function DonutChartPerformance({ data, isLoading }: DonutChartPerformanceProps) {
    const tenderBuckets = data?.tendersByKpi;

    // Pipeline stages (Bid, Quotation Received, RFQ Sent, Not Allowed) and
    // outcomes (Won, Lost, …). Stages overlap with each other and with the
    // outcomes, so the pie is not a strict partition — percentages are shares
    // of the summed slices (called out in the card description).
    const slices = useMemo<DonutSlice[]>(() => {
        if (!tenderBuckets) return [];
        return [
            { name: "Bid", value: tenderBuckets.tendersSubmitted?.length ?? 0, color: "#2563eb" },
            { name: "Quotation Received", value: tenderBuckets.quotationReceived?.length ?? 0, color: "#0ea5e9" },
            { name: "RFQ Sent", value: tenderBuckets.rfqsSent?.length ?? 0, color: "#14b8a6" },
            { name: "Not Allowed", value: tenderBuckets.tendersNotAllowed?.length ?? 0, color: "#94a3b8" },
            { name: "Won", value: tenderBuckets.tendersWon?.length ?? 0, color: "#16a34a" },
            { name: "Lost", value: tenderBuckets.tendersLost?.length ?? 0, color: "#dc2626" },
            { name: "Cancelled", value: tenderBuckets.tendersCancelled?.length ?? 0, color: "#475569" },
            { name: "Disqualified", value: tenderBuckets.tendersDisqualified?.length ?? 0, color: "#f97316" },
            { name: "Missed", value: tenderBuckets.tendersMissed?.length ?? 0, color: "#f59e0b" },
            { name: "Results Awaited", value: tenderBuckets.tenderResultsAwaited?.length ?? 0, color: "#8b5cf6" },
        ];
    }, [tenderBuckets]);

    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    const hasData = slices.some(slice => slice.value > 0);

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
                <CardTitle className="text-base font-semibold">Tender Pipeline &amp; Outcomes</CardTitle>
                <CardDescription>
                    Pipeline stages (bid, quotation received, RFQ sent, not allowed) plus tender outcomes — stages overlap, so each share is of the combined slice total.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                {!hasData ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No data available for the selected filters.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={360}>
                        <PieChart>
                            <Pie
                                data={slices}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="58%"
                                outerRadius="82%"
                                paddingAngle={2}
                                stroke="none"
                                labelLine={false}
                                label={renderSliceLabel}
                            >
                                {slices.map(slice => (
                                    <Cell key={slice.name} fill={slice.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip total={total} />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
