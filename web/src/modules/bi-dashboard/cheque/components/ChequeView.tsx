import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate } from '@/hooks/useFormatedDate';
import { paths } from '@/app/routes/paths';

interface ChequeViewProps {
    data: any;
    isLoading?: boolean;
    className?: string;
}

export function ChequeView({
    data,
    isLoading = false,
    className = '',
}: ChequeViewProps) {
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

    const isExpired = (dueDate: Date | null): boolean => {
        if (!dueDate) return false;
        const expiryDate = new Date(dueDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000);
        return expiryDate < new Date();
    };

    const expiryStatus = data.dueDate ? (isExpired(new Date(data.dueDate)) ? 'Expired' : 'Valid') : null;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Cheque Details
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
                                Cheque No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.chequeNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Cheque Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.chequeDate ? formatDate(data.chequeDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Payee Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.payeeName || data.favouring || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.amount ? formatINR(Number(data.amount)) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="outline">{data.status || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.purpose || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Request Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Request Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Request ID
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestId ?? '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Requested By
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestedByName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Docket No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.docketNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Issue Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.issueDate ? formatDate(data.issueDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expiry Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.expiryDate ? formatDate(data.expiryDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Request Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestStatus || '—'}
                            </TableCell>
                        </TableRow>
                        {data.requestRemarks && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Request Remarks
                                </TableCell>
                                <TableCell className="text-sm break-words" colSpan={3}>
                                    {data.requestRemarks}
                                </TableCell>
                            </TableRow>
                        )}

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

                        {/* Cheque Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Cheque Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Bank Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.bankName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Type
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.type || data.chequeReason || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Due Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.dueDate ? formatDate(data.dueDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expiry Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {expiryStatus ? (
                                    <Badge variant={expiryStatus === 'Expired' ? 'destructive' : 'default'}>
                                        {expiryStatus}
                                    </Badge>
                                ) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Request Type
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.reqType || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Cheque Needs
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.chequeNeeds || '—'}
                            </TableCell>
                        </TableRow>
                        {data.btTransferDate && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    BT Transfer Date
                                </TableCell>
                                <TableCell className="text-sm">
                                    {formatDate(data.btTransferDate)}
                                </TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        )}

                        {/* Linked Demand Draft */}
                        {data.linkedDd && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Linked Demand Draft
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        DD No
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedDd.ddNo || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        DD Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedDd.ddDate ? formatDate(data.linkedDd.ddDate) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Amount
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {data.linkedDd.amount ? formatINR(Number(data.linkedDd.amount)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <Badge variant="outline">{data.linkedDd.status || '—'}</Badge>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Favouring
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedDd.favouring || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Payable At
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedDd.payableAt || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell colSpan={4} className="text-sm">
                                        <Button variant="link" className="h-auto p-0 text-primary" asChild>
                                            <Link to={paths.bi.demandDraftView(data.linkedDd.requestId)}>
                                                <ExternalLink className="h-4 w-4 mr-1 inline" />
                                                View DD
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Linked FDR */}
                        {data.linkedFdr && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Linked FDR
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        FDR No
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedFdr.fdrNo || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        FDR Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedFdr.fdrDate ? formatDate(data.linkedFdr.fdrDate) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Amount
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {data.linkedFdr.amount ? formatINR(Number(data.linkedFdr.amount)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <Badge variant="outline">{data.linkedFdr.status || '—'}</Badge>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Favouring
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedFdr.favouring || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Payable At
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedFdr.payableAt || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell colSpan={4} className="text-sm">
                                        <Button variant="link" className="h-auto p-0 text-primary" asChild>
                                            <Link to={paths.bi.fdrView(data.linkedFdr.requestId)}>
                                                <ExternalLink className="h-4 w-4 mr-1 inline" />
                                                View FDR
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Linked References (fallback when linkedDd/linkedFdr not populated) */}
                        {!data.linkedDd && !data.linkedFdr && (data.linkedDdId || data.linkedFdrId) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Linked References
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Linked DD ID
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedDdId || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Linked FDR ID
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.linkedFdrId || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Handover/Confirmation Details */}
                        {(data.handover || data.confirmation || data.reference) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Handover/Confirmation Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Handover
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.handover || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Confirmation
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.confirmation || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Reference
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.reference || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Transfer Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.transferDate ? formatDate(data.transferDate) : '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Stop Reason */}
                        {data.stopReasonText && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground whitespace-normal [overflow-wrap:anywhere]">
                                        Stop Reason
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {data.stopReasonText || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
