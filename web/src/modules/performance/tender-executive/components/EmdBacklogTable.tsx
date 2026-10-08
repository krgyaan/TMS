import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useEmdCashFlow } from "@/hooks/api/useTenderExecutivePerformance";
import { ColumnHeader } from "./emd-helpers";
import { MetricCell } from "./MetricCell";
import { OtherThanTmsBox } from "./otherThanTmsBox";

/* ================================
   EMD TRACKING TABLE
================================ */

export function EmdBacklogTable(props: { view: "user" | "team" | "all"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useEmdCashFlow(props);
    if (!data) return null;

    return (
        <div className="overflow-x-auto">
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

                            {props.view === "team" && props.teamId === 1 && (
                                <TableHead className="text-center">
                                    <ColumnHeader title="Other than TMS" description="EMDs not linked to any tender in TMS" />
                                </TableHead>
                            )}

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

                            {/* The cell must render whenever the header does, even with no entries, or the
                                row would be one cell short and every later value would shift left
                                under the wrong column. OtherThanTmsBox renders a placeholder. */}
                            {props.view === "team" && props.teamId === 1 && <OtherThanTmsBox entries={data.otherThanTms ?? []} />}

                            {/* Closing */}
                            <MetricCell data={data.pendingAtEnd} />
                        </TableRow>
                    </TableBody>
                </Table>
        </div>
    );
}
