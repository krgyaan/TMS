import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, ExternalLink } from 'lucide-react';
import type { TenderCostingSheet } from '../helpers/costingSheet.types';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface CostingSheetViewProps {
    costingSheet?: TenderCostingSheet | null;
    isLoading?: boolean;
    className?: string;
}

export function CostingSheetView({
    costingSheet,
    isLoading = false,
    className = '',
}: CostingSheetViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!costingSheet) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Costing Sheet
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No costing sheet available for this tender yet.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'default';
            case 'Rejected/Redo':
                return 'destructive';
            case 'Submitted':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Costing Sheet Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Status */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Status
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell colSpan={3}>
                                <Badge variant={getStatusVariant(costingSheet.status) as any}>
                                    {costingSheet.status}
                                </Badge>
                            </TableCell>
                        </TableRow>

                        {/* Google Sheet */}
                        {costingSheet.googleSheetUrl && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Google Sheet
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Sheet Title
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {costingSheet.sheetTitle || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Sheet URL
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {costingSheet.googleSheetUrl ? (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => window.open(costingSheet.googleSheetUrl!, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                Open Sheet
                                            </Button>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Submitted Values */}
                        {(costingSheet.submittedFinalPrice || costingSheet.submittedReceiptPrice || costingSheet.submittedBudgetPrice) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Submitted Values (by Tender Executive)
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Final Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedFinalPrice ? formatINR(Number(costingSheet.submittedFinalPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Receipt Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedReceiptPrice ? formatINR(Number(costingSheet.submittedReceiptPrice)) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Budget Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedBudgetPrice ? formatINR(Number(costingSheet.submittedBudgetPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Gross Margin
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedGrossMargin ? `${costingSheet.submittedGrossMargin}%` : '—'}
                                    </TableCell>
                                </TableRow>
                                {costingSheet.teRemarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            TE Remarks
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {costingSheet.teRemarks}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {costingSheet.submittedAt && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Submitted At
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatDateTime(costingSheet.submittedAt)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Approved Values */}
                        {(costingSheet.finalPrice || costingSheet.receiptPrice || costingSheet.budgetPrice) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Approved Values (by Team Lead)
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Final Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.finalPrice ? formatINR(Number(costingSheet.finalPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Receipt Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.receiptPrice ? formatINR(Number(costingSheet.receiptPrice)) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Budget Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.budgetPrice ? formatINR(Number(costingSheet.budgetPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Gross Margin
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.grossMargin ? `${costingSheet.grossMargin}%` : '—'}
                                    </TableCell>
                                </TableRow>
                                {costingSheet.oemVendorIds && costingSheet.oemVendorIds.length > 0 && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            OEM Vendor IDs
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <div className="flex flex-wrap gap-2">
                                                {costingSheet.oemVendorIds.map((id) => (
                                                    <Badge key={id} variant="outline">
                                                        Vendor ID: {id}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {costingSheet.tlRemarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            TL Remarks
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {costingSheet.tlRemarks}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {costingSheet.approvedAt && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Approved At
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatDateTime(costingSheet.approvedAt)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Rejection Reason */}
                        {costingSheet.rejectionReason && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Rejection Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Rejection Reason
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        <div className="bg-destructive/10 p-3 rounded-md break-words">
                                            {costingSheet.rejectionReason}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Timeline */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Timeline
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(costingSheet.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(costingSheet.updatedAt)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
