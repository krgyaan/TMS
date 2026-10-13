import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useEmdCashFlow } from "@/hooks/api/useTenderExecutivePerformance";
import { ColumnHeader } from "./emd-helpers";
import { MetricCell } from "./MetricCell";

export function EmdTotalsRow(props: { view: "user" | "team" | "all"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useEmdCashFlow(props);
    if (!data?.lifetime) return null;

    return (
        <div className="overflow-x-auto">
            <Table className="w-full table-fixed">
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead />

                        <TableHead className="text-center">
                            <ColumnHeader title="Total EMD Paid" description="All EMD ever paid out for the selected team or member, regardless of period" />
                        </TableHead>

                        <TableHead className="text-center">
                            <ColumnHeader title="Total EMD Received" description="All EMD returned to us for the selected team or member, regardless of period" />
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    <TableRow className="hover:bg-muted/20">
                        <TableCell className="font-semibold">EMD Totals (All Time)</TableCell>

                        <MetricCell data={data.lifetime.paid} />

                        <MetricCell data={data.lifetime.received} strong />
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
