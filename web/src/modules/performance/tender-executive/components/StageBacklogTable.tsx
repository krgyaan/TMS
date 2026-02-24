import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useStageBacklog } from "../tender-executive.hooks";

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

const getPreviousPeriod = (from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diff = toDate.getTime() - fromDate.getTime();

    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - diff);

    return {
        fromDate: prevFrom.toISOString().slice(0, 10),
        toDate: prevTo.toISOString().slice(0, 10),
    };
};

/* ================================
   STAGE INFO
================================ */

const STAGE_INFO: Record<string, string> = {
    tender_info: "Initial tender preparation and data capture",
    rfq: "RFQ sent to OEMs or vendors",
    emd_request: "Earnest Money Deposit initiation",
    physical_docs: "Submission of physical documents",
    costing_sheet: "Costing prepared by executive",
    tender_approval: "Approval by TL / management",
    bid_submission: "Bid submitted on the portal",
    result: "Tender submitted and awaiting result",
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
                                <div key={t.tenderId} className="border-b pb-2 text-xs space-y-1">
                                    <div className="font-medium">{t.tenderNo ?? `Tender #${t.tenderId}`}</div>
                                    {t.tenderName && <div className="text-muted-foreground truncate">{t.tenderName}</div>}
                                    <div>{formatCurrency(t.value)}</div>
                                    {t.daysOverdue !== null && <div className="text-destructive font-medium">{t.daysOverdue} days overdue</div>}
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

export function StageBacklogTable({ userId, fromDate, toDate }: { userId?: number; fromDate?: string; toDate?: string }) {
    if (!fromDate || !toDate) return null;

    const prev = getPreviousPeriod(fromDate, toDate);

    const { data: current = [] } = useStageBacklog({
        userId,
        fromDate,
        toDate,
        view: "user",
    });

    const { data: previous = [] } = useStageBacklog({
        userId,
        fromDate: prev.fromDate,
        toDate: prev.toDate,
        view: "user",
    });

    const prevMap = useMemo(() => {
        const map = new Map<string, any>();
        previous.forEach(r => map.set(r.stageKey, r.metrics.closing));
        return map;
    }, [previous]);

    return (
        <div className="space-y-4">
            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                <CardHeader>
                    <CardTitle>Stage Backlog & Exposure</CardTitle>
                    <CardDescription>Pending workload carried forward and backlog movement compared to previous period</CardDescription>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[1000px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Stage</TableHead>
                                <TableHead className="text-center">
                                    <ColumnHeader title="Opening" description="Pending work at the start of the period" />
                                </TableHead>
                                <TableHead className="text-center">
                                    <ColumnHeader title="Completed" description="Work completed during the period" />
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                    <ColumnHeader title="Closing" description="Pending work at the end of the period" />
                                </TableHead>
                                <TableHead className="text-center text-primary">
                                    <ColumnHeader title="Backlog Change" description="Net change in pending work vs previous period" />
                                </TableHead>
                                <TableHead className="text-center text-destructive">
                                    <ColumnHeader title="Overdue" description="Pending work past deadline" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {current.map(row => {
                                const prevClosing = prevMap.get(row.stageKey) ?? {
                                    count: 0,
                                    value: 0,
                                };

                                const netCount = row.metrics.closing.count - prevClosing.count;

                                const netValue = row.metrics.closing.value - prevClosing.value;

                                return (
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
                                        <MetricCell data={row.metrics.completed} />
                                        <MetricCell data={row.metrics.closing} highlight />

                                        <TableCell className="text-center">
                                            <div
                                                className={`
                                                    inline-flex flex-col items-center px-3 py-1 rounded-xl font-bold
                                                    ${netCount > 0 ? "bg-emerald-100 text-emerald-700" : ""}
                                                    ${netCount < 0 ? "bg-red-100 text-red-700" : ""}
                                                    ${netCount === 0 ? "bg-muted text-muted-foreground" : ""}
                                                `}
                                            >
                                                <span>
                                                    {netCount > 0 ? "+" : ""}
                                                    {netCount}
                                                </span>
                                                <span className="text-[11px]">{formatCurrency(netValue)}</span>
                                            </div>
                                        </TableCell>

                                        <MetricCell data={row.metrics.overdue} danger />
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
