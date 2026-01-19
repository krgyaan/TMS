import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Pencil, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import type { TenderCostingSheet } from '../helpers/costingSheet.types';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface CostingSheetViewProps {
    costingSheet?: TenderCostingSheet | null;
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

export function CostingSheetView({
    costingSheet,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: CostingSheetViewProps) {
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

    if (!costingSheet) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Costing Sheet
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No costing sheet available for this tender yet.
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
                <CardAction className="flex gap-2">
                    {showEditButton && onEdit && (
                        <Button variant="default" size="sm" onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    {showBackButton && onBack && (
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                </CardAction>
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
                                        <TableCell className="text-sm" colSpan={3}>
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
                                        <TableCell className="text-sm" colSpan={3}>
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
                                        <div className="bg-destructive/10 p-3 rounded-md">
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
