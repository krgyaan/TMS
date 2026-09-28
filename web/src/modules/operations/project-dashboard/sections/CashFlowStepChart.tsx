import { formatINR } from "@/hooks/useINRFormatter";
import React, { useMemo } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const GRAPH_EVENT_TYPES = new Set([
    "emd_outflow",
    "po_created",
    "po_approved",
    "vwo_created",
    "vwo_approved",
    "payment_paid",
    "invoice_uploaded",
    "advance_received",
    "advance_utilized",
    "gst_booked",
    "tds_deducted",
]);

const EVENT_LABELS: Record<string, string> = {
    emd_outflow: "EMD Paid",
    po_created: "PO Created",
    po_approved: "PO Approved",
    vwo_created: "VWO Created",
    vwo_approved: "VWO Approved",
    payment_paid: "Payment Paid",
    invoice_uploaded: "Invoice Uploaded",
    advance_received: "Advance Received",
    advance_utilized: "Advance Utilized",
    gst_booked: "GST Booked",
    tds_deducted: "TDS Deducted",
};

const toNumber = (value: number | string | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatLakh = (value: number) => {
    const rounded = Math.round(Math.abs(value) / 100000);
    if (value === 0) return "₹0L";
    return value < 0 ? `-₹${rounded}L` : `₹${rounded}L`;
};

const formatEventLabel = (eventType?: string) => EVENT_LABELS[eventType ?? ""] ?? (eventType ?? "Event");

export interface CashFlowStepChartProps {
    cashFlows: Array<{
        id?: number;
        eventType?: string;
        amount?: number | string;
        direction?: string;
        gstAmount?: number | string;
        tdsAmount?: number | string;
        createdAt?: string | Date | null;
    }>;
}

export const CashFlowStepChart: React.FC<CashFlowStepChartProps> = ({ cashFlows }) => {
    const chartData = useMemo(() => {
        const rows = (cashFlows ?? [])
            .filter((row) => row?.eventType && GRAPH_EVENT_TYPES.has(row.eventType))
            .sort((a, b) => {
                const aTime = new Date(a.createdAt ?? 0).getTime();
                const bTime = new Date(b.createdAt ?? 0).getTime();
                return aTime - bTime;
            });

        if (!rows.length) return [];

        const firstDate = new Date(rows[0].createdAt ?? Date.now());
        let cumulative = 0;

        return rows.map((row) => {
            const date = new Date(row.createdAt ?? Date.now());
            const projectDay = Math.max(
                0,
                Math.floor((date.getTime() - firstDate.getTime()) / 86400000),
            );

            const eventAmount =
                row.eventType === "gst_booked"
                    ? toNumber(row.gstAmount ?? row.amount)
                    : row.eventType === "tds_deducted"
                        ? toNumber(row.tdsAmount ?? row.amount)
                        : toNumber(row.amount);

            const signedAmount = row.direction === "inflow" ? eventAmount : -eventAmount;
            cumulative += signedAmount;

            return {
                projectDay,
                cashFlow: cumulative,
                delta: signedAmount,
                label: formatEventLabel(row.eventType),
            };
        });
    }, [cashFlows]);

    if (!chartData.length) return null;

    const values = chartData.map((point) => point.cashFlow);
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(0, ...values);
    const padding = Math.max(100000, (maxValue - minValue || 100000) * 0.2);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;

        const point = payload[0].payload;
        return (
            <div className="border border-slate-600 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-xl">
                <div className="mb-1 text-slate-100">Day {point.projectDay}</div>
                <div>{point.label}: {formatINR(point.delta)}</div>
            </div>
        );
    };

    return (
        <div className="mt-4 h-[500px] w-full border border-border/60 bg-slate-950/20 p-2">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 18, right: 18, left: 48, bottom: 18 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />

                    <XAxis
                        dataKey="projectDay"
                        type="number"
                        domain={[0, "dataMax"]}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.4)" }}
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                        label={{
                            value: "PROJECT DAY",
                            position: "insideBottom",
                            offset: -10,
                            fill: "#e2e8f0",
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    />

                    <YAxis
                        type="number"
                        domain={[Math.floor((minValue - padding) / 100000) * 100000, Math.ceil((maxValue + padding) / 100000) * 100000]}
                        tickFormatter={(value) => formatLakh(Number(value))}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.4)" }}
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                        label={{
                            value: "CUMULATIVE CASH FLOW (₹)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#e2e8f0",
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    />

                    <Tooltip
                        cursor={{ stroke: "#fbbf24", strokeDasharray: "4 4" }}
                        content={<CustomTooltip />}
                    />

                    <Line
                        type="stepAfter"
                        dataKey="cashFlow"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{
                            r: 4,
                            stroke: "#f8fafc",
                            strokeWidth: 2,
                            fill: "#f59e0b",
                        }}
                        activeDot={{
                            r: 6,
                            stroke: "#f8fafc",
                            strokeWidth: 2,
                            fill: "#f59e0b",
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
