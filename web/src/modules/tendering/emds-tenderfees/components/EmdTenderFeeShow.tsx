import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import type { TenderInfoWithNames } from "@/types/api.types";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";

interface PaymentRequest {
    id: number;
    tenderId: number;
    purpose: 'EMD' | 'Tender Fee' | 'Processing Fee';
    amountRequired: string | number;
    dueDate: string | Date | null;
    status: string;
    remarks?: string | null;
    instruments?: Array<{
        id: number;
        instrumentType: string;
        amount: string | number;
        favouring?: string | null;
        payableAt?: string | null;
        issueDate?: string | Date | null;
        expiryDate?: string | Date | null;
        claimExpiryDate?: string | Date | null;
        courierAddress?: string | null;
        courierDeadline?: number | null;
        status: string;
        details?: any;
    }>;
}

interface EmdTenderFeeShowProps {
    paymentRequests?: PaymentRequest[] | null;
    tender?: TenderInfoWithNames | null;
    isLoading?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
}

const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "—";
    return value;
};

const formatDate = (value?: string | Date | null) => {
    if (!value) return "—";
    return formatDateTime(value);
};

const formatCurrency = (value?: string | number | null) => {
    if (value === null || value === undefined) return "—";
    return formatINR(value);
};

const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'pending') return 'secondary';
    if (statusLower === 'approved' || statusLower === 'received') return 'default';
    if (statusLower === 'rejected' || statusLower === 'cancelled') return 'destructive';
    return 'outline';
};

export const EmdTenderFeeShow = ({
    paymentRequests,
    tender,
    isLoading,
    onEdit,
    onBack,
}: EmdTenderFeeShowProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        <Skeleton className="h-6 w-48" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!paymentRequests || paymentRequests.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Payment Requests Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No payment requests available for this tender.</p>
                </CardContent>
            </Card>
        );
    }

    const emdRequest = paymentRequests.find(r => r.purpose === 'EMD');
    const tenderFeeRequest = paymentRequests.find(r => r.purpose === 'Tender Fee');
    const processingFeeRequest = paymentRequests.find(r => r.purpose === 'Processing Fee');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Payment Requests Details
                </CardTitle>
                <CardAction className="flex gap-2">
                    {onEdit && (
                        <Button variant="default" size="sm" onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    {onBack && (
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
                        {/* Tender Summary */}
                        {tender && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Tender Summary
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Tender Name
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold" colSpan={3}>
                                        {tender.tenderName}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Tender No
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {tender.tenderNo}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Organization
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {tender.organizationName ?? "—"}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        {tender.dueDate ? formatDateTime(tender.dueDate) : "—"}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* EMD Section */}
                        {emdRequest && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        EMD Payment
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(emdRequest.status) as any}>
                                            {emdRequest.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Amount Required
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {formatCurrency(emdRequest.amountRequired)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(emdRequest.dueDate)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground" colSpan={2}>
                                        {/* Empty */}
                                    </TableCell>
                                </TableRow>
                                {emdRequest.remarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Remarks
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatValue(emdRequest.remarks)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Tender Fee Section */}
                        {tenderFeeRequest && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Tender Fee Payment
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(tenderFeeRequest.status) as any}>
                                            {tenderFeeRequest.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Amount Required
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {formatCurrency(tenderFeeRequest.amountRequired)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(tenderFeeRequest.dueDate)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground" colSpan={2}>
                                        {/* Empty */}
                                    </TableCell>
                                </TableRow>
                                {tenderFeeRequest.remarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Remarks
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatValue(tenderFeeRequest.remarks)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Processing Fee Section */}
                        {processingFeeRequest && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Processing Fee Payment
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Status
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(processingFeeRequest.status) as any}>
                                            {processingFeeRequest.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Amount Required
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {formatCurrency(processingFeeRequest.amountRequired)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(processingFeeRequest.dueDate)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground" colSpan={2}>
                                        {/* Empty */}
                                    </TableCell>
                                </TableRow>
                                {processingFeeRequest.remarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Remarks
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatValue(processingFeeRequest.remarks)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Timeline/Status History Section */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Status Timeline
                            </TableCell>
                        </TableRow>
                        {paymentRequests.map((request, idx) => (
                            <TableRow key={request.id || idx} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    {request.purpose}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(request.status) as any}>
                                        {request.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Due Date
                                </TableCell>
                                <TableCell className="text-sm">
                                    {request.dueDate ? formatDate(request.dueDate) : '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Instrument Details - Displayed outside table for better readability */}
                {(emdRequest?.instruments || tenderFeeRequest?.instruments || processingFeeRequest?.instruments) && (
                    <div className="mt-8 space-y-6">
                        {emdRequest?.instruments && emdRequest.instruments.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-base mb-4">EMD Instrument Details</h4>
                                <div className="space-y-4">
                                    {emdRequest.instruments.map((instrument, idx) => (
                                        <div key={instrument.id || idx} className="rounded-md border p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-sm">{instrument.instrumentType}</p>
                                                <Badge variant={getStatusBadgeVariant(instrument.status) as any}>
                                                    {instrument.status}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Amount</p>
                                                    <p>{formatCurrency(instrument.amount)}</p>
                                                </div>
                                                {instrument.favouring && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Favouring</p>
                                                        <p>{formatValue(instrument.favouring)}</p>
                                                    </div>
                                                )}
                                                {instrument.payableAt && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Payable At</p>
                                                        <p>{formatValue(instrument.payableAt)}</p>
                                                    </div>
                                                )}
                                                {instrument.issueDate && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Issue Date</p>
                                                        <p>{formatDate(instrument.issueDate)}</p>
                                                    </div>
                                                )}
                                                {instrument.expiryDate && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Expiry Date</p>
                                                        <p>{formatDate(instrument.expiryDate)}</p>
                                                    </div>
                                                )}
                                                {instrument.claimExpiryDate && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Claim Expiry Date</p>
                                                        <p>{formatDate(instrument.claimExpiryDate)}</p>
                                                    </div>
                                                )}
                                                {instrument.courierAddress && (
                                                    <div className="md:col-span-2">
                                                        <p className="text-xs text-muted-foreground">Courier Address</p>
                                                        <p>{formatValue(instrument.courierAddress)}</p>
                                                    </div>
                                                )}
                                                {instrument.details && (
                                                    <div className="md:col-span-2 space-y-2">
                                                        {Object.entries(instrument.details).map(([key, value]) => (
                                                            value && (
                                                                <div key={key}>
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                                    </p>
                                                                    <p className="text-sm">{String(value)}</p>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tenderFeeRequest?.instruments && tenderFeeRequest.instruments.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-base mb-4">Tender Fee Instrument Details</h4>
                                <div className="space-y-4">
                                    {tenderFeeRequest.instruments.map((instrument, idx) => (
                                        <div key={instrument.id || idx} className="rounded-md border p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-sm">{instrument.instrumentType}</p>
                                                <Badge variant={getStatusBadgeVariant(instrument.status) as any}>
                                                    {instrument.status}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Amount</p>
                                                    <p>{formatCurrency(instrument.amount)}</p>
                                                </div>
                                                {instrument.favouring && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Favouring</p>
                                                        <p>{formatValue(instrument.favouring)}</p>
                                                    </div>
                                                )}
                                                {instrument.payableAt && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Payable At</p>
                                                        <p>{formatValue(instrument.payableAt)}</p>
                                                    </div>
                                                )}
                                                {instrument.details && (
                                                    <div className="md:col-span-2 space-y-2">
                                                        {Object.entries(instrument.details).map(([key, value]) => (
                                                            value && (
                                                                <div key={key}>
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                                    </p>
                                                                    <p className="text-sm">{String(value)}</p>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {processingFeeRequest?.instruments && processingFeeRequest.instruments.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-base mb-4">Processing Fee Instrument Details</h4>
                                <div className="space-y-4">
                                    {processingFeeRequest.instruments.map((instrument, idx) => (
                                        <div key={instrument.id || idx} className="rounded-md border p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-sm">{instrument.instrumentType}</p>
                                                <Badge variant={getStatusBadgeVariant(instrument.status) as any}>
                                                    {instrument.status}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Amount</p>
                                                    <p>{formatCurrency(instrument.amount)}</p>
                                                </div>
                                                {instrument.favouring && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Favouring</p>
                                                        <p>{formatValue(instrument.favouring)}</p>
                                                    </div>
                                                )}
                                                {instrument.details && (
                                                    <div className="md:col-span-2 space-y-2">
                                                        {Object.entries(instrument.details).map(([key, value]) => (
                                                            value && (
                                                                <div key={key}>
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                                    </p>
                                                                    <p className="text-sm">{String(value)}</p>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
