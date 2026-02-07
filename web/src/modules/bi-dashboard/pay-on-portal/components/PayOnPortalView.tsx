import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Globe } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';

interface PayOnPortalViewProps {
    data: any;
    isLoading?: boolean;
    className?: string;
}

export function PayOnPortalView({
    data,
    isLoading = false,
    className = '',
}: PayOnPortalViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Pay on Portal Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Basic Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Portal Name
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.portalName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Transaction Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.transactionDate ? formatDateTime(data.transactionDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.amount ? formatINR(Number(data.amount)) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="outline">{data.status || '—'}</Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.purpose || data.requestPurpose || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                UTR
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.utrNum || data.utr || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Tender/Project Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Tender/Project Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderNo || data.projectNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderName || data.projectName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Bid Validity
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderDueDate ? formatDate(data.tenderDueDate) : data.requestDueDate ? formatDate(data.requestDueDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderStatusName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Payment Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Payment Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Payment Method
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.paymentMethod || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Netbanking
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.isNetbanking ? 'Yes' : 'No'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Debit Card
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.isDebit ? 'Yes' : 'No'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                UTR Message
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.utrMsg || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Account Information */}
                        {data.accountName && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Account Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Account Name
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.accountName || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Account Number
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.accountNumber || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        IFSC
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.ifsc || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Requested By
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.requestedByName || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Return Details */}
                        {(data.returnTransferDate || data.returnUtr) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Return Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Return Transfer Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.returnTransferDate ? formatDate(data.returnTransferDate) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Return UTR
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.returnUtr || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Remarks */}
                        {(data.reason || data.remarks) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                {data.reason && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Reason
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {data.reason || '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.remarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Remarks
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {data.remarks || '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
