import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Pencil, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { TenderWithRelations } from '@/types/api.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface TenderApprovalViewProps {
    tender: TenderWithRelations;
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

const getTlStatusConfig = (status: number) => {
    switch (status) {
        case 1:
            return {
                label: 'Approved - Proceed with Bidding',
                icon: CheckCircle2,
                variant: 'default' as const,
                color: 'text-green-500',
            };
        case 2:
            return {
                label: 'Rejected - Do Not Bid',
                icon: XCircle,
                variant: 'destructive' as const,
                color: 'text-red-500',
            };
        case 3:
            return {
                label: 'Info Sheet Incomplete',
                icon: AlertTriangle,
                variant: 'secondary' as const,
                color: 'text-yellow-500',
            };
        default:
            return {
                label: 'Pending Review',
                icon: Clock,
                variant: 'outline' as const,
                color: 'text-gray-500',
            };
    }
};

export function TenderApprovalView({
    tender,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: TenderApprovalViewProps) {
    const approval = tender.approval;

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

    if (!approval) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Tender Approval
                    </CardTitle>
                    <CardAction className="flex gap-2">
                        {showEditButton && onEdit && (
                            <Button variant="default" size="sm" onClick={onEdit}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Start Approval
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
                    <div className="text-center py-8 text-muted-foreground">
                        No approval information available yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const statusConfig = getTlStatusConfig(approval.tlStatus as number);
    const StatusIcon = statusConfig.icon;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    Tender Approval Details
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
                        {/* Approval Status */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Approval Status
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                TL Decision
                            </TableCell>
                            <TableCell className="w-3/4" colSpan={3}>
                                <Badge variant={statusConfig.variant} className="gap-1.5">
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    {statusConfig.label}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        {approval.tlStatus && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Tender Approval Status
                                </TableCell>
                                <TableCell className="text-sm" colSpan={3}>
                                    {approval.tlStatus}
                                </TableCell>
                            </TableRow>
                        )}
                        {approval.tlDecision && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    TL Remarks
                                </TableCell>
                                <TableCell className="text-sm" colSpan={3}>
                                    {approval.tlDecision}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Approved Status - Show RFQ and Payment Details */}
                        {approval.tlStatus === 1 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        RFQ & Payment Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        RFQ To (Vendor Organizations)
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        {approval.rfqTo && approval.rfqTo.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {approval.rfqTo.map((vendorId) => (
                                                    <Badge key={vendorId} variant="outline">
                                                        Vendor ID: {vendorId}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Processing Fee Mode
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {approval.processingFeeMode || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Tender Fee Mode
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {approval.tenderFeeMode || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        EMD Mode
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        {approval.emdMode || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Document Approvals
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        PQR Selection
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {approval.approvePqrSelection === '1' ? (
                                            <Badge variant="default" className="gap-1.5">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Approved
                                            </Badge>
                                        ) : approval.approvePqrSelection === '2' ? (
                                            <Badge variant="destructive" className="gap-1.5">
                                                <XCircle className="h-3 w-3" />
                                                Rejected
                                            </Badge>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Finance Document Selection
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {approval.approveFinanceDocSelection === '1' ? (
                                            <Badge variant="default" className="gap-1.5">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Approved
                                            </Badge>
                                        ) : approval.approveFinanceDocSelection === '2' ? (
                                            <Badge variant="destructive" className="gap-1.5">
                                                <XCircle className="h-3 w-3" />
                                                Rejected
                                            </Badge>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Rejected Status - Show Rejection Details */}
                        {approval.tlStatus === 2 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Rejection Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Tender Status
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {approval.tenderStatus ? `Status ID: ${approval.tenderStatus}` : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        OEM Not Allowed
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {approval.oemNotAllowed ? 'Yes' : 'No'}
                                    </TableCell>
                                </TableRow>
                                {approval.tlRejectionRemarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Rejection Remarks
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <div className="bg-destructive/10 p-3 rounded-md">
                                                {approval.tlRejectionRemarks}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Incomplete Status - Show Incomplete Fields */}
                        {approval.tlStatus === 3 && approval.incompleteFields && approval.incompleteFields.length > 0 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Incomplete Fields
                                    </TableCell>
                                </TableRow>
                                {approval.incompleteFields.map((field, index) => (
                                    <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            {field.fieldName}
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-md text-yellow-800 dark:text-yellow-200">
                                                {field.comment}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}

                        {/* Timestamps */}
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
                                {formatDateTime(approval.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(approval.updatedAt)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
