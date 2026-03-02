import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useEmdCashFlow } from "../tender-executive.hooks";
import { ColumnHeader } from "./emd-helpers";
import { MetricCell } from "./MetricCell";

export function EmdBacklogTable(props: { view: "user" | "team"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useEmdCashFlow(props);

    if (!data) return null;

    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        {/* =======================
                           HEADER ROW 1
                        ======================= */}
                        <TableRow>
                            <TableHead rowSpan={2} />

                            <TableHead rowSpan={2} className="text-center">
                                <ColumnHeader title="Opening" description="EMDs paid before the period and not received back" />
                            </TableHead>

                            <TableHead colSpan={3} className="text-center">
                                <ColumnHeader title="During" description="EMD payments and refunds during the selected period" />
                            </TableHead>

                            <TableHead rowSpan={2} className="text-center">
                                <ColumnHeader title="Closing" description="EMDs pending at the end of the period" />
                            </TableHead>
                        </TableRow>

                        {/* =======================
                           HEADER ROW 2
                        ======================= */}
                        <TableRow>
                            <TableHead className="text-center">Paid</TableHead>
                            <TableHead className="text-center">Received (Earlier)</TableHead>
                            <TableHead className="text-center">Received (Current)</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">EMD Amount</TableCell>

                            {/* OPENING */}
                            <MetricCell data={data.paidPriorNotReceived} />

                            {/* DURING — PAID */}
                            <MetricCell data={data.paidDuring} />

                            {/* DURING — RECEIVED (PRIOR PAID) */}
                            <MetricCell data={data.receivedForPrior} strong />

                            {/* DURING — RECEIVED (CURRENT PAID) */}
                            <MetricCell data={data.receivedForDuring} strong />

                            {/* CLOSING */}
                            <MetricCell data={data.pendingAtEnd} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
