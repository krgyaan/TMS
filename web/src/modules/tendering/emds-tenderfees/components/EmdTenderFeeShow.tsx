import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { FileText } from "lucide-react";
import type { TenderInfoWithNames } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
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
}

const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "—";
    return value;
};

const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'pending') return 'secondary';
    if (statusLower === 'approved' || statusLower === 'received') return 'default';
    if (statusLower === 'rejected' || statusLower === 'cancelled') return 'destructive';
    return 'outline';
};

const hasValue = (value?: string | Date | number | null) => {
    return value !== null && value !== undefined && value !== "";
};

export const EmdTenderFeeShow = ({
    paymentRequests,
    isLoading,
}: EmdTenderFeeShowProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!paymentRequests || paymentRequests.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Payment Requests Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No payment requests available for this tender.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const emdRequest = paymentRequests.find(r => r.purpose === 'EMD');
    const tenderFeeRequest = paymentRequests.find(r => r.purpose === 'Tender Fee');
    const processingFeeRequest = paymentRequests.find(r => r.purpose === 'Processing Fee');

    const renderInstrumentRows = (instruments: PaymentRequest['instruments'], purposeLabel: string) => {
        if (!instruments || instruments.length === 0) return null;

        return (
            <>
                <TableRow className="bg-muted/30">
                    <TableCell colSpan={4} className="font-medium text-sm italic">
                        {purposeLabel} - Instrument Details
                    </TableCell>
                </TableRow>
                {instruments.map((instrument, idx) => (
                    <>
                        {/* Instrument Header Row */}
                        <TableRow key={`${instrument.id || idx}-header`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Instrument Type
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {instrument.instrumentType}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(instrument.status) as any}>
                                    {instrument.status}
                                </Badge>
                            </TableCell>
                        </TableRow>

                        {/* Instrument Amount & Favouring Row */}
                        <TableRow key={`${instrument.id || idx}-amount`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold" colSpan={hasValue(instrument.favouring) ? 1 : 3}>
                                {formatINR(instrument.amount)}
                            </TableCell>
                            {hasValue(instrument.favouring) && (
                                <>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Favouring
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                        {formatValue(instrument.favouring)}
                                    </TableCell>
                                </>
                            )}
                        </TableRow>

                        {/* Instrument Payable At & Issue Date Row */}
                        {(hasValue(instrument.payableAt) || hasValue(instrument.issueDate)) && (
                            <TableRow key={`${instrument.id || idx}-payable`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                {hasValue(instrument.payableAt) ? (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Payable At
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={hasValue(instrument.issueDate) ? 1 : 3}>
                                            {formatValue(instrument.payableAt)}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Issue Date
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatDateTime(instrument.issueDate)}
                                        </TableCell>
                                    </>
                                )}
                                {hasValue(instrument.payableAt) && hasValue(instrument.issueDate) && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Issue Date
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDateTime(instrument.issueDate)}
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        {/* Instrument Expiry Dates Row */}
                        {(hasValue(instrument.expiryDate) || hasValue(instrument.claimExpiryDate)) && (
                            <TableRow key={`${instrument.id || idx}-expiry`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                {hasValue(instrument.expiryDate) ? (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Expiry Date
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={hasValue(instrument.claimExpiryDate) ? 1 : 3}>
                                            {formatDateTime(instrument.expiryDate)}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Claim Expiry Date
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatDateTime(instrument.claimExpiryDate)}
                                        </TableCell>
                                    </>
                                )}
                                {hasValue(instrument.expiryDate) && hasValue(instrument.claimExpiryDate) && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Claim Expiry Date
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDateTime(instrument.claimExpiryDate)}
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        {/* Instrument Courier Details Row */}
                        {(instrument.courierAddress || instrument.courierDeadline) && (
                            <TableRow key={`${instrument.id || idx}-courier`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Courier Address
                                </TableCell>
                                <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                    {formatValue(instrument.courierAddress)}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Courier Deadline
                                </TableCell>
                                <TableCell className="text-sm">
                                    {instrument.courierDeadline ? `${instrument.courierDeadline} days` : "—"}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Instrument Additional Details Rows */}
                        {instrument.details && Object.entries(instrument.details).length > 0 && (
                            <>
                                {(() => {
                                    const entries = Object.entries(instrument.details).filter(([, value]) => value);
                                    const rows = [];
                                    for (let i = 0; i < entries.length; i += 2) {
                                        const [key1, value1] = entries[i];
                                        const [key2, value2] = entries[i + 1] || [null, null];
                                        rows.push(
                                            <TableRow key={`${instrument.id || idx}-details-${i}`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                                <TableCell className="text-sm font-medium text-muted-foreground capitalize">
                                                    {key1.replace(/([A-Z])/g, ' $1').trim()}
                                                </TableCell>
                                                <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                                    {value1 instanceof Date || (typeof value1 === "string" && !isNaN(Date.parse(value1)))
                                                        ? formatDateTime(value1)
                                                        : String(value1)}
                                                </TableCell>
                                                {key2 ? (
                                                    <>
                                                        <TableCell className="text-sm font-medium text-muted-foreground capitalize">
                                                            {key2.replace(/([A-Z])/g, ' $1').trim()}
                                                        </TableCell>
                                                        <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                                            {value2 instanceof Date || (typeof value2 === "string" && !isNaN(Date.parse(value2)))
                                                                ? formatDateTime(value2)
                                                                : String(value2)}
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <TableCell colSpan={2} />
                                                )}
                                            </TableRow>
                                        );
                                    }
                                    return rows;
                                })()}
                            </>
                        )}

                        {/* Spacer Row between instruments */}
                        {idx < instruments.length - 1 && (
                            <TableRow key={`${instrument.id || idx}-spacer`}>
                                <TableCell colSpan={4} className="h-2 bg-muted/10" />
                            </TableRow>
                        )}
                    </>
                ))}
            </>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Payment Requests Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
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
                                        {formatINR(emdRequest.amountRequired)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDateTime(emdRequest.dueDate)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Remarks
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                        {formatValue(emdRequest.remarks)}
                                    </TableCell>
                                </TableRow>
                                {renderInstrumentRows(emdRequest.instruments, "EMD")}
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
                                        {formatINR(tenderFeeRequest.amountRequired)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDateTime(tenderFeeRequest.dueDate)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Remarks
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                        {formatValue(tenderFeeRequest.remarks)}
                                    </TableCell>
                                </TableRow>
                                {renderInstrumentRows(tenderFeeRequest.instruments, "Tender Fee")}
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
                                        {formatINR(processingFeeRequest.amountRequired)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Due Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDateTime(processingFeeRequest.dueDate)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Remarks
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                        {formatValue(processingFeeRequest.remarks)}
                                    </TableCell>
                                </TableRow>
                                {renderInstrumentRows(processingFeeRequest.instruments, "Processing Fee")}
                            </>
                        )}

                        {/* Summary Row */}
                        <TableRow className="bg-primary/10">
                            <TableCell colSpan={2} className="font-bold text-sm">
                                Total Amount Required
                            </TableCell>
                            <TableCell colSpan={2} className="font-bold text-sm">
                                {formatINR(
                                    (Number(emdRequest?.amountRequired) || 0) +
                                    (Number(tenderFeeRequest?.amountRequired) || 0) +
                                    (Number(processingFeeRequest?.amountRequired) || 0)
                                )}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
