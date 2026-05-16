import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText } from "lucide-react";
import { InstrumentBiView } from "./InstrumentBiView";

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

            {emdRequest?.instruments?.map(inst => (
                <InstrumentBiView key={inst.id} instrumentId={inst.id} instrumentType={inst.instrumentType} />
            ))}
            {tenderFeeRequest?.instruments?.map(inst => (
                <InstrumentBiView key={inst.id} instrumentId={inst.id} instrumentType={inst.instrumentType} />
            ))}
            {processingFeeRequest?.instruments?.map(inst => (
                <InstrumentBiView key={inst.id} instrumentId={inst.id} instrumentType={inst.instrumentType} />
            ))}
        </div>
    );
};

import { usePaymentRequestsByTender } from '@/hooks/api/usePaymentRequests';
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
