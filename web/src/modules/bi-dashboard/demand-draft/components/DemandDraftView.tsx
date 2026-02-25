import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate } from '@/hooks/useFormatedDate';

interface DemandDraftViewProps {
    data: any;
    isLoading?: boolean;
    className?: string;
}

export function DemandDraftView({
    data,
    isLoading = false,
    className = '',
}: DemandDraftViewProps) {
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
                    <FileText className="h-5 w-5" />
                    Demand Draft Details
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
                                DD No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.ddNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                DD Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.ddDate ? formatDate(data.ddDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Request No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.reqNo || '—'}
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
                                {data.purpose || data.requestPurpose || '—'}
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
                                Request Type
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestType || '—'}
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
                                Courier Address
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                {data.courierAddress || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Docket No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.docketNo || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Issue Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.issueDate ? formatDate(data.issueDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expiry Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.expiryDate ? formatDate(data.expiryDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Request Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestStatus || '—'}
                            </TableCell>
                            <TableCell colSpan={2} />
                        </TableRow>
                        {data.requestRemarks && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Remarks
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

                        {/* DD Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                DD Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                DD Needs
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.ddNeeds || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                DD Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.ddPurpose || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Payable At Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Payable At Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Payable At
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.payableAt || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground whitespace-normal [overflow-wrap:anywhere]">
                                Favouring
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.favouring || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Remarks */}
                        {data.ddRemarks && (
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
                                        {data.ddRemarks || '—'}
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
