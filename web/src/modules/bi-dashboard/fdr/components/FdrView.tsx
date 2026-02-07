import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Wallet } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate } from '@/hooks/useFormatedDate';

interface FdrViewProps {
    data: any;
    isLoading?: boolean;
    className?: string;
}

export function FdrView({
    data,
    isLoading = false,
    className = '',
}: FdrViewProps) {
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
                    <Wallet className="h-5 w-5" />
                    FDR Details
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
                                FDR No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.fdrNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                FDR Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.fdrDate ? formatDate(data.fdrDate) : '—'}
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
                            <TableCell className="text-sm font-medium text-muted-foreground whitespace-normal [overflow-wrap:anywhere]">
                                Favouring
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.favouring || '—'}
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

                        {/* FDR Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                FDR Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Source
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrSource || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                ROI
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.roi ? `${Number(data.roi)}%` : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Margin Percent
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.marginPercent ? `${Number(data.marginPercent)}%` : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                FDR Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrPurpose || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expiry Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrExpiryDate ? formatDate(data.fdrExpiryDate) : data.expiryDate ? formatDate(data.expiryDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                FDR Needs
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrNeeds || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Payable At
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.payableAt || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Requested By
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestedByName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Remarks */}
                        {data.fdrRemark && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Remarks
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {data.fdrRemark || '—'}
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
