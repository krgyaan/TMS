import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
            <CardContent className="space-y-8">
                {tender && (
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground uppercase tracking-wide">Tender Summary</p>
                        <p className="text-base font-semibold mt-1">{tender.tenderName}</p>
                        <p className="text-sm text-muted-foreground">
                            Tender No: {tender.tenderNo} • Organization: {tender.organizationName ?? "—"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Due Date: {tender.dueDate ? formatDateTime(tender.dueDate) : "—"}
                        </p>
                    </div>
                )}

                {/* EMD Section */}
                {emdRequest && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold text-base">EMD Payment</h3>
                            <Badge variant={getStatusBadgeVariant(emdRequest.status)}>
                                {emdRequest.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Amount Required</p>
                                <p className="text-base font-semibold">{formatCurrency(emdRequest.amountRequired)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Due Date</p>
                                <p className="text-base font-semibold">{formatDate(emdRequest.dueDate)}</p>
                            </div>
                            {emdRequest.remarks && (
                                <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground">Remarks</p>
                                    <p className="text-sm">{formatValue(emdRequest.remarks)}</p>
                                </div>
                            )}
                        </div>
                        {emdRequest.instruments && emdRequest.instruments.length > 0 && (
                            <div className="mt-4 space-y-4">
                                <h4 className="font-medium text-sm">Instrument Details</h4>
                                {emdRequest.instruments.map((instrument, idx) => (
                                    <div key={instrument.id || idx} className="rounded-md border p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm">{instrument.instrumentType}</p>
                                            <Badge variant={getStatusBadgeVariant(instrument.status)}>
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
                        )}
                    </section>
                )}

                {/* Tender Fee Section */}
                {tenderFeeRequest && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold text-base">Tender Fee Payment</h3>
                            <Badge variant={getStatusBadgeVariant(tenderFeeRequest.status)}>
                                {tenderFeeRequest.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Amount Required</p>
                                <p className="text-base font-semibold">{formatCurrency(tenderFeeRequest.amountRequired)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Due Date</p>
                                <p className="text-base font-semibold">{formatDate(tenderFeeRequest.dueDate)}</p>
                            </div>
                            {tenderFeeRequest.remarks && (
                                <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground">Remarks</p>
                                    <p className="text-sm">{formatValue(tenderFeeRequest.remarks)}</p>
                                </div>
                            )}
                        </div>
                        {tenderFeeRequest.instruments && tenderFeeRequest.instruments.length > 0 && (
                            <div className="mt-4 space-y-4">
                                <h4 className="font-medium text-sm">Instrument Details</h4>
                                {tenderFeeRequest.instruments.map((instrument, idx) => (
                                    <div key={instrument.id || idx} className="rounded-md border p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm">{instrument.instrumentType}</p>
                                            <Badge variant={getStatusBadgeVariant(instrument.status)}>
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
                        )}
                    </section>
                )}

                {/* Processing Fee Section */}
                {processingFeeRequest && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold text-base">Processing Fee Payment</h3>
                            <Badge variant={getStatusBadgeVariant(processingFeeRequest.status)}>
                                {processingFeeRequest.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Amount Required</p>
                                <p className="text-base font-semibold">{formatCurrency(processingFeeRequest.amountRequired)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Due Date</p>
                                <p className="text-base font-semibold">{formatDate(processingFeeRequest.dueDate)}</p>
                            </div>
                            {processingFeeRequest.remarks && (
                                <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground">Remarks</p>
                                    <p className="text-sm">{formatValue(processingFeeRequest.remarks)}</p>
                                </div>
                            )}
                        </div>
                        {processingFeeRequest.instruments && processingFeeRequest.instruments.length > 0 && (
                            <div className="mt-4 space-y-4">
                                <h4 className="font-medium text-sm">Instrument Details</h4>
                                {processingFeeRequest.instruments.map((instrument, idx) => (
                                    <div key={instrument.id || idx} className="rounded-md border p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm">{instrument.instrumentType}</p>
                                            <Badge variant={getStatusBadgeVariant(instrument.status)}>
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
                        )}
                    </section>
                )}

                {/* Timeline/Status History Section */}
                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">Status Timeline</h3>
                    <div className="space-y-2">
                        {paymentRequests.map((request, idx) => (
                            <div key={request.id || idx} className="flex items-center gap-4 text-sm">
                                <Badge variant={getStatusBadgeVariant(request.status)}>
                                    {request.purpose}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge variant={getStatusBadgeVariant(request.status)}>
                                    {request.status}
                                </Badge>
                                {request.dueDate && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground">
                                            Due: {formatDate(request.dueDate)}
                                        </span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </CardContent>
        </Card>
    );
};
