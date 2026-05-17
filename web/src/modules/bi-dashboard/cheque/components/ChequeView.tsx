import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Receipt, Eye } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
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
                className="flex items-center gap-1 text-primary hover:underline"
            >
                <Eye className="h-4 w-4" />
                {'View'}
            </a>
        </div>
    );
};

export function ChequeView({
    data,
    isLoading = false,
    className = '',
}: ChequeViewProps) {
    console.log("Cheque: ", data);
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
                                    {formatDateTime(data.requestCreatedAt)}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Cheque in Favour of
                                </TableCell>
                                <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
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
                                    {data.chequeReason || data.purpose || data.requestPurpose || '—'}
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
                                    Cheque Needed In
                                </TableCell>
                                <TableCell className="text-sm">
                                    {data.chequeNeeds || '—'} Hours
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

                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }
