import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useEmdCashFlow } from "../tender-executive.hooks";
import { ColumnHeader } from "./emd-helpers";
import { MetricCell } from "./MetricCell";

/* ================================
   EMD TRACKING TABLE
================================ */

export function EmdBacklogTable(props: { view: "user" | "team"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useEmdCashFlow(props);
    if (!data) return null;

    return (
        <Card className="border-0 ring-1 ring-border/50 shadow-sm">
            <CardContent className="p-0">
                <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead />

                            <TableHead className="text-center">
                                <ColumnHeader title="Opening" description="EMD paid before the start of the period but not received back" />
                            </TableHead>

                            <TableHead className="text-center">
                                <ColumnHeader title="Paid During Period" description="EMD paid during the selected period" />
                            </TableHead>

                            <TableHead className="text-center">
                                <ColumnHeader title="Received (Prior Paid)" description="EMD received during the period for payments made before the period" />
                            </TableHead>

                            <TableHead className="text-center">
                                <ColumnHeader title="Received (Current Paid)" description="EMD received during the period for payments made during the period" />
                            </TableHead>

                            <TableHead className="text-center">
                                <ColumnHeader title="Closing" description="EMD pending at the end of the period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow className="hover:bg-muted/20">
                            <TableCell className="font-semibold">EMD Tracking</TableCell>

                            {/* Opening */}
                            <MetricCell data={data.paidPriorNotReceived} />

                            {/* Paid During */}
                            <MetricCell data={data.paidDuring} />

                            {/* Received for Prior Paid */}
                            <MetricCell data={data.receivedForPrior} strong />

                            {/* Received for Current Paid */}
                            <MetricCell data={data.receivedForDuring} strong />

                            {/* Closing */}
                            <MetricCell data={data.pendingAtEnd} />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
