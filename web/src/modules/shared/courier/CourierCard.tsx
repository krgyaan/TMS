import { useCourier } from "@/modules/shared/courier/courier.hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Package } from "lucide-react";
import { formatDate } from "@/hooks/useFormatedDate";
import { COURIER_STATUS_LABELS } from "@/modules/shared/courier/courier.types";

interface CourierCardProps {
    courierId: number | null | undefined;
    title?: string;
}

export function CourierCard({ courierId, title }: CourierCardProps) {
    const { data: courier, isLoading } = useCourier(courierId ?? 0);

    if (!courierId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!courier) return null;

    const statusLabel = COURIER_STATUS_LABELS[courier.status] || `Status ${courier.status}`;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-blue-500" />
                    {title || "Courier Details"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-1.5 text-sm">
                    <div><span className="font-medium text-muted-foreground">Organisation:</span> {courier.toOrg || '—'}</div>
                    <div><span className="font-medium text-muted-foreground">Contact:</span> {courier.toName || '—'} {courier.toMobile ? `(${courier.toMobile})` : ''}</div>
                    <div><span className="font-medium text-muted-foreground">Address:</span> {courier.toAddr || '—'}{courier.toPin ? ` - ${courier.toPin}` : ''}</div>
                    <div><span className="font-medium text-muted-foreground">Provider:</span> {courier.courierProvider || '—'}</div>
                    <div><span className="font-medium text-muted-foreground">Status:</span> {statusLabel}</div>
                    {courier.trackingNumber && <div><span className="font-medium text-muted-foreground">Tracking:</span> {courier.trackingNumber}</div>}
                    {courier.docketNo && <div><span className="font-medium text-muted-foreground">Docket No:</span> {courier.docketNo}</div>}
                    {courier.docketSlip && (
                        <div>
                            <span className="font-medium text-muted-foreground">Docket Slip:</span>{' '}
                            <a href={`/uploads/courier/${courier.docketSlip}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" /> View
                            </a>
                        </div>
                    )}
                    {courier.deliveryPod && (
                        <div>
                            <span className="font-medium text-muted-foreground">Proof of Delivery:</span>{' '}
                            <a href={`/uploads/courier/${courier.deliveryPod}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" /> View
                            </a>
                        </div>
                    )}
                    {courier.pickupDate && <div><span className="font-medium text-muted-foreground">Pickup Date:</span> {formatDate(courier.pickupDate)}</div>}
                    {courier.deliveryDate && <div><span className="font-medium text-muted-foreground">Delivery Date:</span> {formatDate(courier.deliveryDate)}</div>}
                    {courier.courierDocs && courier.courierDocs.length > 0 && (
                        <div>
                            <span className="font-medium text-muted-foreground">Courier Docs:</span>
                            <div className="ml-4 space-y-1 mt-1">
                                {courier.courierDocs.map((doc: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{doc}</span>
                                        <a href={`/uploads/courier/${doc}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                            <Eye className="h-3 w-3" /> View
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
