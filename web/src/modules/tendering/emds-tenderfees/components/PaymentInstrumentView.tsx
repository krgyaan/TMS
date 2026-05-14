import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";
import { getStatusBadgeVariant, getReadableStatusName, BI_STATUSES } from "../constants";
import { useInstrumentDetails } from "@/hooks/api/usePaymentRequests";
import { InstrumentBiView } from "./InstrumentBiView";

interface PaymentInstrumentViewProps {
    paymentRequestId: number;
}

export const PaymentInstrumentView = ({ paymentRequestId }: PaymentInstrumentViewProps) => {
    const { data, isLoading, error } = useInstrumentDetails(paymentRequestId);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-10 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                        No payment request found or error loading data.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { tenderId, type, tenderNo, projectName, purpose, amountRequired, status, createdAt, instruments } = data;
    const isNonTms = tenderId === 0;

    const getTypeLabel = (type?: string) => {
        switch (type) {
            case 'TMS': return 'TMS Entry';
            case 'Other Than TMS': return 'Other Than TMS';
            case 'Old Entries': return 'Old Entry';
            case 'Other Than Tender': return 'Other Than Tender';
            default: return type || 'Unknown';
        }
    };

    return (
        <div className="space-y-4">
            {isNonTms && (
                <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {getTypeLabel(type)}
                    </Badge>
                    {tenderNo && (
                        <span className="text-sm text-muted-foreground">
                            Tender No: {tenderNo}
                        </span>
                    )}
                </div>
            )}

            <Card>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Purpose</TableCell>
                                <TableCell className="text-sm font-semibold">{purpose}</TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                <TableCell className="text-sm font-semibold">{formatINR(amountRequired)}</TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(status) as any}>
                                        {getReadableStatusName(status as keyof typeof BI_STATUSES)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">Created On</TableCell>
                                <TableCell className="text-sm">{formatDate(createdAt)}</TableCell>
                            </TableRow>
                            {projectName && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Project Name</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{projectName}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {instruments
                ?.filter((inst: any) => {
                    if (inst.instrumentType !== 'Cheque') return true;
                    const details = inst.details as any;
                    return !details?.linkedDdId && !details?.linkedFdrId;
                })
                .map((instrument: any) => (
                <InstrumentBiView
                    key={instrument.id}
                    instrumentId={instrument.id}
                    instrumentType={instrument.instrumentType}
                />
            ))}

            {(!instruments || instruments.length === 0) && (
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                            No instruments found for this payment request.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
