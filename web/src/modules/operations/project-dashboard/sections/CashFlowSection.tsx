import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectCashFlows, useProjectCashFlowSummary } from "@/hooks/api/useCashFlows";
import { formatINR } from "@/hooks/useINRFormatter";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import React, { useMemo } from "react";

interface CashFlowSectionProps {
    projectId: number | null;
}

const EVENT_TYPE_LABELS: Record<string, { label: string | ((row: any) => string); className: string | ((row: any) => string) }> = {
    po_created: { label: "PO Created", className: "bg-blue-100 text-blue-800" },
    vwo_created: { label: "VWO Created", className: "bg-blue-100 text-blue-800" },
    po_approved: { label: "PO Approved", className: "bg-green-100 text-green-800" },
    vwo_approved: { label: "VWO Approved", className: "bg-green-100 text-green-800" },
    payment_requested: { label: "Payment Requested", className: "bg-yellow-100 text-yellow-800" },
    payment_approved: { label: "Payment Approved", className: "bg-green-100 text-green-800" },
    payment_paid: { label: "Payment Paid", className: "bg-purple-100 text-purple-800" },
    invoice_uploaded: { label: "Invoice Uploaded", className: "bg-indigo-100 text-indigo-800" },
    gst_booked: { label: "GST Booked", className: "bg-orange-100 text-orange-800" },
    tds_deducted: { label: "TDS Deducted", className: "bg-red-100 text-red-800" },
    advance_received: { label: "Advance Received", className: "bg-teal-100 text-teal-800" },
    advance_utilized: { label: "Advance Utilized", className: "bg-teal-100 text-teal-800" },
    retention_held: { label: "Retention Held", className: "bg-gray-100 text-gray-800" },
    retention_released: { label: "Retention Released", className: "bg-gray-100 text-gray-800" },
    refund_received: { label: "Refund Received", className: "bg-pink-100 text-pink-800" },
    write_off: { label: "Write Off", className: "bg-red-100 text-red-800" },
    adjustment: { label: "Adjustment", className: "bg-gray-100 text-gray-800" },
    emd_outflow: { 
        label: (row) => Number(row.amount) === 0 ? "EMD Voided" : "EMD Outflow", 
        className: (row) => Number(row.amount) === 0 ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-800" 
    },
};

const DIRECTION_CLASSES: Record<string, string> = {
    inflow: "bg-green-100 text-green-800",
    outflow: "bg-red-100 text-red-800",
    adjustment: "bg-orange-100 text-orange-800",
};

export const CashFlowSection: React.FC<CashFlowSectionProps> = ({
    projectId,
}) => {
    const { data: cashFlows = [], isLoading: flowsLoading } = useProjectCashFlows(projectId!);
    const { data: summary, isLoading: summaryLoading } = useProjectCashFlowSummary(projectId!);

    const loading = flowsLoading || summaryLoading;

    const summaryCards = useMemo(() => [
        { title: "Total Inflow", value: summary?.totalInflow ?? 0, icon: "↗" },
        { title: "Total Outflow", value: summary?.totalOutflow ?? 0, icon: "↘" },
        { title: "Total TDS", value: summary?.totalTds ?? 0, icon: "₹" },
        { title: "Total GST", value: summary?.totalGst ?? 0, icon: "📊" },
        { title: "Net Cash Flow", value: summary?.netCashFlow ?? 0, icon: "💰" },
    ], [summary]);

    const columns = useMemo<ColDef[]>(() => [
        {
            field: "eventType",
            headerName: "Event Type",
            sortable: true,
            filter: true,
            width: 180,
            cellRenderer: (p: CustomCellRendererProps) => {
                const event = p.value || "";
                const rowData = p.data || {};
                const config = EVENT_TYPE_LABELS[event] || { label: event, className: "bg-gray-100 text-gray-800" };
                const label = typeof config.label === "function" ? config.label(rowData) : config.label;
                const className = typeof config.className === "function" ? config.className(rowData) : config.className;
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            width: 140,
            valueFormatter: (p: ValueFormatterParams) => formatINR(p.value),
            cellClass: "font-mono text-right",
        },
        {
            field: "direction",
            headerName: "Direction",
            sortable: true,
            filter: true,
            width: 120,
            cellRenderer: (p: CustomCellRendererProps) => {
                const dir = p.value || "";
                const className = DIRECTION_CLASSES[dir] || "bg-gray-100 text-gray-800";
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
                        {dir}
                    </span>
                );
            },
        },
        {
            field: "referenceType",
            headerName: "Ref Type",
            sortable: true,
            filter: true,
            width: 140,
        },
        {
            field: "referenceNo",
            headerName: "Ref No",
            sortable: true,
            filter: true,
            width: 160,
            cellRenderer: (p: CustomCellRendererProps) => (
                <span className="font-mono text-sm">{p.value || "-"}</span>
            ),
        },
        {
            field: "createdAt",
            headerName: "Date",
            sortable: true,
            width: 120,
            valueFormatter: (p: ValueFormatterParams) => {
                if (!p.value) return "-";
                const date = new Date(p.value);
                return date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                });
            },
        },
    ], []);

    if (!projectId) return null;

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                    <Skeleton className="h-64 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    if (cashFlows.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold">Cash Flow</CardTitle>
                    <CardDescription>No cash flow entries found for this project</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <p>No cash flow entries found for this project</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Cash Flow</CardTitle>
                <CardDescription>{cashFlows.length} entr{cashFlows.length !== 1 ? 'ies' : 'y'} found</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {summaryCards.map((card, idx) => (
                        <Card key={idx} className="h-20">
                            <CardContent className="flex flex-col justify-center items-start p-4 h-full">
                                <div className="text-2xl mb-1">{card.icon}</div>
                                <p className="text-xs text-muted-foreground">{card.title}</p>
                                <p className="text-lg font-semibold font-mono">{formatINR(card.value)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <DataTable
                    data={cashFlows}
                    columnDefs={columns}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 15,
                        domLayout: "autoHeight",
                        rowData: cashFlows,
                    }}
                />
            </CardContent>
        </Card>
    );
};