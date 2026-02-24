import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useEmdBalance } from "../tender-executive.hooks";

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
   MAIN TABLE
================================ */

export function EmdBalanceTable({ userId, fromDate, toDate }) {
    const { data } = useEmdBalance({
        userId,
        fromDate,
        toDate,
        view: "user",
    });

    if (!data || !fromDate || !toDate) return null;

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-bold">EMD Balance Sheet</h2>
                <p className="text-sm text-muted-foreground">Security deposits requested, returned, settled and currently locked</p>
            </div>

            <Card className="shadow-sm border-0 ring-1 ring-border/50">
                <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[1000px]">
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead />

                                <TableHead className="text-center">
                                    <ColumnHeader title="Requested" description="EMDs requested during the selected period" />
                                </TableHead>

                                <TableHead className="text-center">
                                    <ColumnHeader title="Returned" description="EMDs returned back to the company" />
                                </TableHead>

                                <TableHead className="text-center">
                                    <ColumnHeader title="Settled" description="EMDs settled / forfeited against project or cancelled" />
                                </TableHead>

                                <TableHead className="text-center font-semibold text-primary">
                                    <ColumnHeader title="Closing Balance" description="EMDs still locked and not yet returned" />
                                </TableHead>

                                <TableHead className="text-center text-destructive">
                                    <ColumnHeader title="Overdue" description="Locked EMDs past tender due date" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            <TableRow className="hover:bg-muted/20">
                                <TableCell className="font-semibold">EMD Amount</TableCell>

                                <MetricCell data={data.requested} />
                                <MetricCell data={data.returned} />
                                <MetricCell data={data.settled} />
                                <MetricCell data={data.closing} strong />
                                <MetricCell data={data.overdue} danger />
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

/* ================================
   METRIC CELL WITH DRILLDOWN
================================ */

function MetricCell({ data, strong = false, danger = false }: { data: any; strong?: boolean; danger?: boolean }) {
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
                            min-w-[64px] px-3 py-1 rounded-xl
                            cursor-pointer text-sm font-bold
                            ${strong ? "bg-primary/10 text-primary" : ""}
                            ${danger ? "bg-destructive/10 text-destructive" : "bg-muted"}
                        `}
                    >
                        <span>{data.count}</span>
                        <span className="text-[11px] font-normal text-muted-foreground">{formatCurrency(data.value)}</span>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-96 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">
                            {data.count} EMDs · {formatCurrency(data.value)}
                        </div>

                        {data.drilldown?.length ? (
                            data.drilldown.map(e => (
                                <div key={`${e.tenderId}-${e.instrumentType}`} className="border-b pb-2 text-xs space-y-1">
                                    <div className="font-medium">{e.tenderNo ?? `Tender #${e.tenderId}`}</div>

                                    {e.tenderName && <div className="text-muted-foreground truncate">{e.tenderName}</div>}

                                    <div>
                                        {e.instrumentType} · {formatCurrency(e.amount)}
                                    </div>

                                    <div className="text-muted-foreground">Status: {e.status}</div>

                                    {e.daysLocked !== null && <div className="text-destructive font-medium">Locked for {e.daysLocked} days</div>}
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
