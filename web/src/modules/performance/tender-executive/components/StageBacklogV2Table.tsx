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

const formatCurrencySafe = (amount: unknown) => {
    if (amount === null || amount === undefined) return "-";
    const v = Number(amount);
    if (!Number.isFinite(v)) return "-";

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(v);
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

function MetricCell({ bucket, color }: { bucket?: any; color?: "green" | "red" | "yellow" }) {
    if (!bucket || bucket.count === 0) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    const colorCls =
        color === "green" ? "bg-emerald-100 text-emerald-700" : color === "red" ? "bg-rose-100 text-rose-700" : color === "yellow" ? "bg-yellow-100 text-yellow-800" : "bg-muted";

    return (
        <TableCell className="text-center">
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        className={`
              mx-auto
              min-w-[96px]
              max-w-[140px]
              px-3 py-1.5
              rounded-xl
              cursor-pointer
              ${colorCls}
            `}
                    >
                        <div className="font-bold text-sm leading-tight whitespace-nowrap">{bucket.count}</div>

                        <div className="text-[11px] leading-tight whitespace-nowrap opacity-80">{formatCurrencySafe(bucket.value)}</div>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-96 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">
                            {bucket.count} tenders · {formatCurrencySafe(bucket.value)}
                        </div>

                        {bucket.drilldown?.map((t: any) => (
                            <div key={t.tenderId} className="border-b pb-2 text-xs flex justify-between gap-2">
                                <div className="min-w-0 space-y-0.5">
                                    <div className="font-medium truncate">{t.tenderNo ?? `Tender #${t.tenderId}`}</div>

                                    {t.tenderName && <div className="text-muted-foreground truncate">{t.tenderName}</div>}

                                    <div className="whitespace-nowrap">{formatCurrencySafe(t.value)}</div>
                                </div>

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
                        ))}
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
    const { data } = useStageBacklogV2({ view, userId, teamId, fromDate, toDate });
    if (!data) return null;

    const { stages } = data;

    const terminalStages = new Set(["won", "lost", "disqualified", "missed"]);
    const negativeStages = new Set(["lost", "missed", "disqualified"]);

    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead rowSpan={2} />
                            <TableHead rowSpan={2} className="text-center">
                                <ColumnHeader title="Opening" description="Pending at start" />
                            </TableHead>
                            <TableHead colSpan={3} className="text-center">
                                <ColumnHeader title="During" description="Movement during period" />
                            </TableHead>
                            <TableHead rowSpan={2} className="text-center">
                                <ColumnHeader title="Closing" description="Final state" />
                            </TableHead>
                        </TableRow>

                        <TableRow>
                            <TableHead className="text-center">Allocated</TableHead>
                            <TableHead className="text-center">Completed</TableHead>
                            <TableHead className="text-center">Pending</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {Object.entries(stages).map(([key, stage]: any) => {
                            const isTerminal = terminalStages.has(key);
                            const isWon = key === "won";
                            const isNegative = negativeStages.has(key);
                            const isPendingStage = !isTerminal;

                            return (
                                <TableRow key={key} className="hover:bg-muted/20">
                                    <TableCell className="font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}</TableCell>

                                    {/* OPENING — Pending */}
                                    <MetricCell bucket={stage.opening} />

                                    {/* DURING — Allocated */}
                                    <MetricCell bucket={stage.during.total} />

                                    {/* DURING — Completed */}
                                    <MetricCell bucket={stage.during.completed} color={isWon ? "green" : isNegative ? "red" : undefined} />

                                    {/* DURING — Pending */}
                                    {!isTerminal ? <MetricCell bucket={stage.during.pending} color="yellow" /> : <TableCell />}

                                    {/* CLOSING */}
                                    <MetricCell bucket={stage.total} color={isWon ? "green" : isNegative ? "red" : isPendingStage ? "yellow" : undefined} />
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
