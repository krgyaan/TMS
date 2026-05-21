import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useInstrumentDetails } from "@/hooks/api/usePaymentRequests";
import { InstrumentBiView } from "./InstrumentBiView";

interface PaymentInstrumentViewProps {
    paymentRequestId: number;
}

export const PaymentInstrumentView = ({ paymentRequestId }: PaymentInstrumentViewProps) => {
    const { data, isLoading, error } = useInstrumentDetails(paymentRequestId);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-10 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                        No payment request found or error loading data.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { tenderId, type, tenderNo, instruments } = data;
    const isNonTms = tenderId === 0;

    const getTypeLabel = (type?: string) => {
        switch (type) {
            case 'TMS': return 'TMS Entry';
            case 'Other Than TMS': return 'Other Than TMS';
            case 'Old Entries': return 'Old Entry';
            case 'Other Than Tender': return 'Other Than Tender';
            default: return type || 'Unknown';
        }
    };

    return (
        <div className="space-y-4">
            {isNonTms && (
                <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {getTypeLabel(type)}
                    </Badge>
                    {tenderNo && (
                        <span className="text-sm text-muted-foreground">
                            Tender No: {tenderNo}
                        </span>
                    )}
                </div>
            )}

            {instruments
                ?.filter((inst: any) => {
                    if (inst.instrumentType !== 'Cheque') return true;
                    const details = inst.details as any;
                    return !details?.linkedDdId && !details?.linkedFdrId;
                })
                .map((instrument: any) => (
                <InstrumentBiView
                    key={instrument.id}
                    instrumentId={instrument.id}
                    instrumentType={instrument.instrumentType}
                />
            ))}

            {(!instruments || instruments.length === 0) && (
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                            No instruments found for this payment request.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
