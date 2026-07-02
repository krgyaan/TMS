import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmdCashFlow } from "../tender-executive.hooks";
import { ColumnHeader } from "./emd-helpers";
import { MetricCell } from "./MetricCell";

export function EmdPaidTable(props: { view: "user" | "team"; userId?: number; teamId?: number; fromDate?: string; toDate?: string }) {
    const { data } = useEmdCashFlow(props);

    if (!data || !props.fromDate || !props.toDate) return null;

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead />
                            <TableHead className="text-center">
                                <ColumnHeader title="Paid Before Period" description="EMDs paid before the selected period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Paid During Period" description="EMDs paid within the selected period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">EMD Amount</TableCell>
                            <MetricCell data={data.paid.prior} />
                            <MetricCell data={data.paid.during} strong />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
