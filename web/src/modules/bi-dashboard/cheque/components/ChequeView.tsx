import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, ExternalLink, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import { paths } from '@/app/routes/paths';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface ChequeViewProps {
    data: any;
    isLoading?: boolean;
    className?: string;
}

const FileLink = ({ file }: { file?: string }) => {
    if (!file) return <span className="text-muted-foreground">Not Uploaded</span>;

    return (
        <div className="flex gap-3 items-center">
            <a
                href={tenderFilesService.getFileUrl(file)}
                target="_blank"
                className="flex items-center gap-1 text-blue-600 hover:underline"
            >
                <Eye className="h-4 w-4" />
                {file?.split('_').slice(1).join('_')}
            </a>
        </div>
    );
};

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

    const expiryStatus = data.chequeDate ? (isExpired(new Date(data.chequeDate)) ? 'Expired' : 'Valid') : null;

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
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Tender Number
                                </TableCell>
                                <TableCell className="text-sm font-semibold">
                                    {data.tenderNo}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Tender Name
                                </TableCell>
                                <TableCell className="text-sm font-semibold">
                                    {data.tenderName}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Requested By
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.requestedByName || '—'}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Requeste Date
                                </TableCell>
                                <TableCell className="text-sm">
                                    {formatDateTime(data.createdAt)}
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
                                    <Badge variant="outline">{data.chequeStatus == 'Accepted' ? 'Paid' : data.chequeStatus || '—'}</Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Purpose
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.chequeReason || '—'}
                                </TableCell>
                            </TableRow>

                            {/* Cheque Details */}
                            <TableRow className="bg-muted/50">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                    Cheque Details
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
                                    Account to be debited from
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.bankName || '—'}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Cheque Needed In (Hours)
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.chequeNeeds || '—'}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Cheque Image
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.chequeImage ? <FileLink file={data.chequeImage} /> : '—'}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Handover Image
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.handoverImage ? <FileLink file={data.handoverImage} /> : '—'}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
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
                                <TableCell colSpan={2} />
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
                                            Receiving of the cheque handed over
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <FileLink file={data.handover} />
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Positive pay confirmation copy
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <FileLink file={data.confirmation} />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Soft copy of Cheque
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <FileLink file={data.chequeImagePath} />
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
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }
