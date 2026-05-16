import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, Receipt } from 'lucide-react';
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
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="outline">{data.status || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Requested By
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestedByName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* DD Details */}
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
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Courier Address
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                {data.courierAddressJson ? (
                                    <div className="space-y-0.5">
                                        <div><span className="font-medium">Name:</span> {data.courierAddressJson.name || '—'}</div>
                                        {data.courierAddressJson.phone && <div><span className="font-medium">Phone:</span> {data.courierAddressJson.phone}</div>}
                                        <div><span className="font-medium">Address:</span> {[data.courierAddressJson.line1, data.courierAddressJson.line2].filter(Boolean).join(', ') || '—'}</div>
                                        <div>
                                            {[data.courierAddressJson.city, data.courierAddressJson.state].filter(Boolean).join(', ')}
                                            {data.courierAddressJson.pincode ? ` - ${data.courierAddressJson.pincode}` : ''}
                                        </div>
                                    </div>
                                ) : (data.courierAddress || '—')}
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
                                Courier Details
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                {data.courierDetails ? (
                                    <div className="space-y-0.5">
                                        <div><span className="font-medium">Organisation:</span> {data.courierDetails.toOrg || '—'}</div>
                                        <div><span className="font-medium">Contact:</span> {data.courierDetails.toName || '—'} {data.courierDetails.toMobile ? `(${data.courierDetails.toMobile})` : ''}</div>
                                        <div><span className="font-medium">Address:</span> {data.courierDetails.toAddr || '—'} {data.courierDetails.toPin ? `- ${data.courierDetails.toPin}` : ''}</div>
                                        {data.courierDetails.courierProvider && <div><span className="font-medium">Provider:</span> {data.courierDetails.courierProvider}</div>}
                                        {data.courierDetails.docketNo && <div><span className="font-medium">Docket No:</span> {data.courierDetails.docketNo}</div>}
                                    </div>
                                ) : (data.reqNo || '—')}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                DD Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.ddDate ? formatDate(data.ddDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                DD No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.ddNo || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Issue Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.issueDate ? formatDate(data.issueDate) : '—'}
                            </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Docket No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.docketNo || '—'}
                            </TableCell>
                            <TableCell colSpan={2} />
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


                        {/* Remarks */}
                        {data.ddRemarks && (
                            <>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        A/C Remarks
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {data.ddRemarks || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>

                {data.linkedCheque && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            Linked Cheque
                        </h4>
                        <Table>
                            <TableBody>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Cheque No</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.linkedCheque.chequeNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Cheque Date</TableCell>
                                    <TableCell className="text-sm">{data.linkedCheque.chequeDate ? formatDate(data.linkedCheque.chequeDate) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Bank Name</TableCell>
                                    <TableCell className="text-sm">{data.linkedCheque.bankName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.linkedCheque.amount ? formatINR(Number(data.linkedCheque.amount)) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                                    <TableCell><Badge variant="outline">{data.linkedCheque.status || '—'}</Badge></TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Favouring</TableCell>
                                    <TableCell className="text-sm">{data.linkedCheque.favouring || '—'}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
