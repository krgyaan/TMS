import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <tbody className="divide-y divide-border">
                            {/* Approval Status */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Approval Status
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    TL Decision
                                </td>
                                <td className="px-4 py-3 w-3/4" colSpan={3}>
                                    <Badge variant={statusConfig.variant} className="gap-1.5">
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {statusConfig.label}
                                    </Badge>
                                </td>
                            </tr>

                            {/* Approved Status - Show RFQ and Payment Details */}
                            {approval.tlStatus === 1 && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            RFQ & Payment Information
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            RFQ To (Vendor Organizations)
                                        </td>
                                        <td className="px-4 py-3 text-sm" colSpan={3}>
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
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Tender Fee Mode
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {approval.tenderFeeMode || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            EMD Mode
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {approval.emdMode || '—'}
                                        </td>
                                    </tr>

                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Document Approvals
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            PQR Selection
                                        </td>
                                        <td className="px-4 py-3 text-sm">
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
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Finance Document Selection
                                        </td>
                                        <td className="px-4 py-3 text-sm">
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
                                        </td>
                                    </tr>
                                </>
                            )}

                            {/* Rejected Status - Show Rejection Details */}
                            {approval.tlStatus === 2 && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Rejection Details
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Tender Status
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {approval.tenderStatus ? `Status ID: ${approval.tenderStatus}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            OEM Not Allowed
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {approval.oemNotAllowed ? 'Yes' : 'No'}
                                        </td>
                                    </tr>
                                    {approval.tlRejectionRemarks && (
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                Rejection Remarks
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={3}>
                                                <div className="bg-destructive/10 p-3 rounded-md">
                                                    {approval.tlRejectionRemarks}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}

                            {/* Incomplete Status - Show Incomplete Fields */}
                            {approval.tlStatus === 3 && approval.incompleteFields && approval.incompleteFields.length > 0 && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Incomplete Fields
                                        </td>
                                    </tr>
                                    {approval.incompleteFields.map((field, index) => (
                                        <tr key={index} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                {field.fieldName}
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={3}>
                                                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-md text-yellow-800 dark:text-yellow-200">
                                                    {field.comment}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}

                            {/* Timestamps */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Timeline
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Created At
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {formatDateTime(approval.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Last Updated
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {formatDateTime(approval.updatedAt)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
