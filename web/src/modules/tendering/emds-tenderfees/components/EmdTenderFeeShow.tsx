import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { AlertCircle, FileText } from "lucide-react";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { DemandDraftView, FdrView, BankGuaranteeView, ChequeView, BankTransferView, PortalPaymentView } from "./instrument-views";

interface PaymentRequest {
    id: number;
    tenderId: number;
    purpose: "EMD" | "Tender Fee" | "Processing Fee";
    amountRequired: string | number;
    dueDate: string | Date | null;
    createdAt: string | Date | null;
    requestedBy?: string | null;
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
        action?: number | null;
        generatedPdf?: string | null;
        cancelPdf?: string | null;
        docketSlip?: string | null;
        coveringLetter?: string | null;
        extraPdfPaths?: string | null;
        extensionRequestPdf?: string | null;
        cancellationRequestPdf?: string | null;
    }>;
}

interface EmdTenderFeeShowProps {
    paymentRequests?: PaymentRequest[] | null;
    text: string;
}

type Instrument = NonNullable<PaymentRequest["instruments"]>[number];

const renderInstrumentRows = (instruments: PaymentRequest["instruments"]) => {
    if (!instruments || instruments.length === 0) return null;

    const grouped = instruments.reduce((acc, inst) => {
        const type = inst.instrumentType;
        if (!acc[type]) acc[type] = [];
        acc[type].push(inst);
        return acc;
    }, {} as Record<string, Instrument[]>);

    return (
        <TableRow>
            <TableCell colSpan={4} className="p-0 border-0">
                <div className="space-y-2">
                    {Object.entries(grouped).map(([type, typeInstruments]) => {
                        switch (type) {
                            case 'DD':
                                return <DemandDraftView key={type} instruments={typeInstruments} isNonTms={false} />;
                            case 'FDR':
                                return <FdrView key={type} instruments={typeInstruments} isNonTms={false} />;
                            case 'BG':
                                return <BankGuaranteeView key={type} instruments={typeInstruments} isNonTms={false} />;
                            case 'Cheque':
                                return <ChequeView key={type} instruments={typeInstruments} isNonTms={false} />;
                            case 'Bank Transfer':
                                return <BankTransferView key={type} instruments={typeInstruments} isNonTms={false} />;
                            case 'Portal Payment':
                                return <PortalPaymentView key={type} instruments={typeInstruments} isNonTms={false} />;
                            default:
                                return null;
                        }
                    })}
                </div>
            </TableCell>
        </TableRow>
    );
};

export const EmdTenderFeeShow = ({ paymentRequests, text }: EmdTenderFeeShowProps) => {
    if (!paymentRequests) return null;

    const emdRequest = paymentRequests.find(r => r.purpose === "EMD");
    const tenderFeeRequest = paymentRequests.find(r => r.purpose === "Tender Fee");
    const processingFeeRequest = paymentRequests.find(r => r.purpose === "Processing Fee");

    return (
        <div className="space-y-4">
            {text && (
                <Alert variant="default" className="border-amber-500/30 text-amber-950 dark:border-amber-500/30 dark:text-amber-50 bg-amber-50 dark:bg-amber-950/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{text} {text.split(",").length > 1 ? "are" : "is"} not applicable for this tender.</AlertDescription>
                </Alert>
            )}
            <Card>
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
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(emdRequest.amountRequired)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Request On</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatDate(emdRequest.createdAt)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Due Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(emdRequest.dueDate)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Requested By</TableCell>
                                    <TableCell className="text-sm">{emdRequest.requestedBy}</TableCell>
                                </TableRow>
                                {renderInstrumentRows(emdRequest.instruments)}
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
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(tenderFeeRequest.amountRequired)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Request On</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatDate(tenderFeeRequest.createdAt)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Due Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(tenderFeeRequest.dueDate)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Requested By</TableCell>
                                    <TableCell className="text-sm">{tenderFeeRequest.requestedBy}</TableCell>
                                </TableRow>
                                {renderInstrumentRows(tenderFeeRequest.instruments)}
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
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(processingFeeRequest.amountRequired)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Request On</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatDate(processingFeeRequest.createdAt)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Due Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(processingFeeRequest.dueDate)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Requested By</TableCell>
                                    <TableCell className="text-sm">{processingFeeRequest.requestedBy}</TableCell>
                                </TableRow>
                                {renderInstrumentRows(processingFeeRequest.instruments)}
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
        </div>
    );
};

import { usePaymentRequestsByTender } from '@/hooks/api/usePaymentRequests';
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Self-fetching section for EMD & Tender Fees */
export function EmdTenderFeeSection({ tenderId }: { tenderId: number | null }) {
    const { data: paymentRequests, isLoading: isLoadingPaymentRequests } = usePaymentRequestsByTender(tenderId);
    const { data: infoSheet, isLoading: isLoadingInfoSheet } = useInfoSheet(tenderId);

    if (isLoadingPaymentRequests || isLoadingInfoSheet) {
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

    let text = "";
    if (infoSheet?.emdRequired == 'NO' || infoSheet?.emdRequired == 'EXEMPT' || infoSheet?.emdRequired == null) text += "EMD, ";
    if (infoSheet?.tenderFeeRequired == 'NO' || infoSheet?.tenderFeeRequired == null) text += "Tender Fee, ";
    if (infoSheet?.processingFeeRequired == 'NO' || infoSheet?.processingFeeRequired == null) text += "Processing Fee";

    if (!paymentRequests) {
        return (
            <Card>
                <CardContent className="pt-0">
                    {
                        text && (
                            <Alert variant="default" className="border-amber-500/30 text-amber-950 dark:border-amber-500/30 dark:text-amber-50 bg-amber-50 dark:bg-amber-950/20">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{text} {text.split(",").length > 1 ? "are" : "is"} not applicable for this tender.</AlertDescription>
                            </Alert>
                        )
                    }
                    <div className="flex flex-col items-center justify-center py-6 ">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No {['EMD', 'Tender Fee', 'Processing Fee'].filter((t) => !text.includes(t)).join(", ")} requests available for this tender.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return <EmdTenderFeeShow paymentRequests={paymentRequests ?? null} text={text} />;
}
