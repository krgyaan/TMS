import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmdCashFlow } from "../tender-executive.hooks";
import { ColumnHeader } from "./emd-helpers";
import { MetricCell } from "./MetricCell";

export function EmdReceivedTable(props: { view: "user" | "team"; userId?: number; teamId?: number; fromDate?: string; toDate?: string }) {
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
                                <ColumnHeader title="Received for Earlier EMDs" description="Refunds against EMDs paid before the period" />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeader title="Received for Current EMDs" description="Refunds against EMDs paid during the period" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">EMD Amount</TableCell>
                            <MetricCell data={data.received.priorPaid} />
                            <MetricCell data={data.received.duringPaid} strong />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
