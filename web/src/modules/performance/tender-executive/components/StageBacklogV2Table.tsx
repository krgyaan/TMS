import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Eye, Info } from "lucide-react";
import { useStageBacklogV2 } from "../tender-executive.hooks";
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
   METRIC CELL (WITH DRILLDOWN)
================================ */

function MetricCell({ bucket }: { bucket: any }) {
    if (!bucket || bucket.count === 0) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    return (
        <TableCell className="text-center">
            <Popover>
                <PopoverTrigger asChild>
                    <div className="mx-auto min-w-[72px] px-3 py-1 rounded-xl bg-muted cursor-pointer">
                        <div className="font-bold text-sm">{bucket.count}</div>
                        <div className="text-[11px] text-muted-foreground">{formatCurrency(bucket.value)}</div>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-96 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">
                            {bucket.count} tenders · {formatCurrency(bucket.value)}
                        </div>

                        {bucket.drilldown?.length ? (
                            bucket.drilldown.map((t: any) => (
                                <div key={t.tenderId} className="border-b pb-2 text-xs space-y-1 flex justify-between gap-2">
                                    {/* LEFT */}
                                    <div className="min-w-0 space-y-0.5">
                                        <div className="font-medium truncate">{t.tenderNo ?? `Tender #${t.tenderId}`}</div>

                                        {t.tenderName && <div className="text-muted-foreground truncate">{t.tenderName}</div>}

                                        <div>{formatCurrency(t.value)}</div>

                                        {t.assignedAt && <div>Assigned: {new Date(t.assignedAt).toLocaleDateString()}</div>}
                                        {t.approvedAt && <div>Approved: {new Date(t.approvedAt).toLocaleDateString()}</div>}
                                        {t.bidAt && <div>Bid: {new Date(t.bidAt).toLocaleDateString()}</div>}
                                        {t.resultAt && <div>Result: {new Date(t.resultAt).toLocaleDateString()}</div>}
                                    </div>

                                    {/* RIGHT */}
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            window.open(paths.tendering.tenderView(t.tenderId), "_blank", "noopener,noreferrer");
                                        }}
                                        className="h-7 w-7 flex items-center justify-center rounded-md
                                                   text-muted-foreground hover:text-primary hover:bg-muted"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground">No records</p>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </TableCell>
    );
}

/* ================================
   MAIN TABLE
================================ */

export function StageBacklogV2Table({ view, userId, teamId, fromDate, toDate }: { view: "user" | "team"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useStageBacklogV2({
        view,
        userId,
        teamId,
        fromDate,
        toDate,
    });

    if (!data) return null;

    const stages = data.stages;

    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[1100px]">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />

                            <TableHead className="text-center">
                                <ColumnHeader title="Opening" description="Pending at the start of the period" />
                            </TableHead>

                            <TableHead className="text-center">
                                <ColumnHeader title="During" description="New activity during the period" />
                            </TableHead>

                            <TableHead className="text-center font-semibold">
                                <ColumnHeader title="Total" description="Total till end of period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {Object.entries(stages).map(([key, stage]: any) => (
                            <TableRow key={key} className="hover:bg-muted/20">
                                <TableCell className="font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}</TableCell>

                                <MetricCell bucket={stage.opening} />
                                <MetricCell bucket={stage.during} />
                                <MetricCell bucket={stage.total} />
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
