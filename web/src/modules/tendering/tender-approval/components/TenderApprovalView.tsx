import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { dummyTechnicalDocuments, dummyFinancialDocuments } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';

// Helper function to map document IDs to names
const mapDocumentIdsToNames = (ids: string[] | null | undefined, documentList: Array<{ value: string; label: string }>): string[] => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
    return ids
        .map(id => {
            const doc = documentList.find(d => d.value === id);
            return doc ? doc.label : id;
        })
        .filter(Boolean);
};

const formatDocuments = (documents: string[] | Array<{ id?: number; documentName: string }> = []) => {
    if (!documents.length) {
        return <span className="text-muted-foreground">No documents listed</span>
    }

    return (
        <div className="flex flex-wrap gap-2">
            {documents.map((doc, index) => {
                // Handle both string arrays and object arrays
                const docName = typeof doc === 'string' ? doc : doc.documentName;
                const docKey = typeof doc === 'string' ? doc : (doc.id ?? doc.documentName ?? index);

                return (
                    <Badge key={docKey} variant="outline">
                        {docName}
                    </Badge>
                );
            })}
        </div>
    )
}

interface TenderApprovalViewProps {
    tender: TenderWithRelations;
    isLoading?: boolean;
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
                                <TableCell className="text-sm break-words" colSpan={3}>
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
                                {approval.approvePqrSelection === '2' && approval.alternativeTechnicalDocs && approval.alternativeTechnicalDocs.length > 0 && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Alternative Technical Documents
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatDocuments(mapDocumentIdsToNames(approval.alternativeTechnicalDocs, dummyTechnicalDocuments))}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {approval.approveFinanceDocSelection === '2' && approval.alternativeFinancialDocs && approval.alternativeFinancialDocs.length > 0 && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Alternative Financial Documents
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatDocuments(mapDocumentIdsToNames(approval.alternativeFinancialDocs, dummyFinancialDocuments))}
                                        </TableCell>
                                    </TableRow>
                                )}
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
                                            <div className="bg-destructive/10 p-3 rounded-md break-words">
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
                                            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded-md text-yellow-800 dark:text-yellow-200 break-words">
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
