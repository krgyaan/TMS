import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Eye, Info } from "lucide-react";
import { useStageBacklog } from "../tender-executive.hooks";
import { Navigate, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

/* ================================
   HELPERS
================================ */

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

const formatLabel = (label: string) =>
    label
        .split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

/* ================================
   STAGE INFO
================================ */

const STAGE_INFO: Record<string, string> = {
    tender_info_sheet: "Initial tender preparation and data capture",
    tender_approval: "Approval by TL / management",
    rfq: "RFQ sent to OEMs or vendors",
    emd_request: "Earnest Money Deposit initiation",
    physical_docs: "Submission of physical documents",
    document_checklist: "Document checklist completion",
    costing_sheet: "Costing prepared by executive",
    bid_submission: "Bid submitted on the portal",
    tq: "Technical queries stage",
    ra: "Reverse auction stage",
    result: "Tender result declared",
};

/* ================================
   COLUMN HEADER
================================ */

function ColumnHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex items-center justify-center gap-1">
            <span className="font-semibold">{title}</span>
            <Tooltip>
                <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
            </Tooltip>
        </div>
    );
}

/* ================================
   METRIC CELL
================================ */

function MetricCell({ data, highlight, danger }: { data: any; highlight?: boolean; danger?: boolean }) {
    const navigate = useNavigate();
    if (!data || data.count === 0) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    return (
        <TableCell className="text-center">
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        className={`
                            mx-auto flex flex-col items-center justify-center
                            min-w-[48px] px-2 py-1 rounded-xl
                            text-sm font-bold cursor-pointer
                            ${highlight ? "bg-primary/10 text-primary" : ""}
                            ${danger ? "bg-destructive/10 text-destructive" : "bg-muted"}
                        `}
                    >
                        <span>{data.count}</span>
                        <span className="text-[11px] text-muted-foreground">{formatCurrency(data.value)}</span>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-80 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">{data.count} tenders</div>

                        <div className="text-xs text-muted-foreground">Total Value: {formatCurrency(data.value)}</div>

                        {data.drilldown?.length ? (
                            data.drilldown.map((t: any) => (
                                <div key={t.tenderId} className="border-b pb-2 text-xs space-y-1 flex justify-between gap-2">
                                    {/* LEFT: Tender Info */}
                                    <div className="min-w-0 space-y-0.5">
                                        <div className="font-medium truncate">{t.tenderNo ?? `Tender #${t.tenderId}`}</div>

                                        {t.tenderName && <div className="text-muted-foreground truncate">{t.tenderName}</div>}

                                        {/* Status */}
                                        {t.status && <div className="text-[11px] font-semibold text-primary">{t.status}</div>}

                                        <div>{formatCurrency(t.value)}</div>

                                        {t.daysOverdue !== null && <div className="text-destructive font-medium">{t.daysOverdue} days overdue</div>}
                                    </div>

                                    {/* RIGHT: View Icon */}
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            window.open(paths.tendering.tenderView(t.tenderId), "_blank", "noopener,noreferrer");
                                        }}
                                        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md
               text-muted-foreground hover:text-primary hover:bg-muted transition"
                                        title="View tender in new tab"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground">No tenders</p>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </TableCell>
    );
}

/* ================================
   MAIN COMPONENT
================================ */

export function StageBacklogTable({ view, userId, teamId, fromDate, toDate }: { view: "user" | "team"; userId?: number; teamId?: number; fromDate?: string; toDate?: string }) {
    if (!fromDate || !toDate) return null;

    const { data: rows = [] } = useStageBacklog({
        view,
        userId,
        teamId,
        fromDate,
        toDate,
    });

    return (
        <div className="space-y-4">
            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                <CardHeader>
                    <CardTitle>Stage Backlog</CardTitle>
                    <CardDescription>Cumulative opening, current workload, completion and overdue exposure</CardDescription>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[1100px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Stage</TableHead>
                                <TableHead className="text-center">
                                    <ColumnHeader title="Opening" description="Pending work at the start of the period" />
                                </TableHead>
                                {/* <TableHead className="text-center">
                                    <ColumnHeader title="Current" description="Total applicable tenders" />
                                </TableHead> */}
                                <TableHead className="text-center">
                                    <ColumnHeader title="Completed" description="Completed as of period end" />
                                </TableHead>
                                <TableHead className="text-center font-semibold text-primary">
                                    <ColumnHeader title="Pending" description="Still pending as of period end" />
                                </TableHead>
                                <TableHead className="text-center text-destructive">
                                    <ColumnHeader title="Overdue" description="Pending work past deadline" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.stageKey} className="hover:bg-muted/20">
                                    <TableCell className="font-semibold sticky left-0 bg-background border-r">
                                        <div className="flex items-center gap-2">
                                            {formatLabel(row.stageKey)}
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs max-w-xs">{STAGE_INFO[row.stageKey] ?? "No description"}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>

                                    <MetricCell data={row.metrics.opening} />
                                    {/* <MetricCell data={row.metrics.current} /> */}
                                    <MetricCell data={row.metrics.completed} />
                                    <MetricCell data={row.metrics.pending} highlight />
                                    <MetricCell data={row.metrics.overdue} danger />
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
