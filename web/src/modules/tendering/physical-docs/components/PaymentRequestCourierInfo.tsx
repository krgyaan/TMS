import { usePaymentRequestsByTender } from "@/hooks/api/usePaymentRequests";
import { CourierCard } from "@/modules/shared/courier/CourierCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentRequestCourierInfoProps {
    tenderId: number | null;
}

const INSTRUMENT_COLORS: Record<string, string> = {
    DD: "bg-blue-50 text-blue-700 border-blue-200",
    FDR: "bg-purple-50 text-purple-700 border-purple-200",
    BG: "bg-amber-50 text-amber-700 border-amber-200",
};

export function PaymentRequestCourierInfo({ tenderId }: PaymentRequestCourierInfoProps) {
    const { data: requests, isLoading } = usePaymentRequestsByTender(tenderId);
    
    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-5 w-60" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }
    
    if (!requests || !Array.isArray(requests) || requests.length === 0) return null;

    const ddFdrBgInstruments = requests.flatMap(req =>
        (req.instruments || []).filter((inst: any) =>
            ['DD', 'FDR', 'BG'].includes(inst.instrumentType?.trim()?.toUpperCase()) &&
            (inst.reqNo || inst.courierNo)
        )
    );

    if (ddFdrBgInstruments.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
                Courier Details (from EMD/Tender Fees)
            </h3>
            <div className="space-y-3">
                {ddFdrBgInstruments.map((instrument: any) => {
                    const courierId = Number(instrument.reqNo || instrument.courierNo);
                    if (isNaN(courierId)) return null;
                    return (
                        <div key={instrument.id} className="space-y-2">
                            <Badge
                                variant="outline"
                                className={INSTRUMENT_COLORS[instrument.instrumentType] || ""}
                            >
                                {instrument.instrumentType}
                            </Badge>
                            <CourierCard courierId={courierId} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
