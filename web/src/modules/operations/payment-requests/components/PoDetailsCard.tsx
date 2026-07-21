import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getShortId } from "@/lib/id-utils";
import { formatINR } from "@/hooks/useINRFormatter";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import type { PurchaseOrderRow } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";

interface PoDetailsCardProps {
    po: PurchaseOrderRow;
    requestAmount?: number | null;
}

export const PoDetailsCard: React.FC<PoDetailsCardProps> = ({ po, requestAmount }) => {
    const cap = po.amountAfterTds ? Number(po.amountAfterTds) : Number(po.grandTotal || 0);
    const remaining = cap - Number(po.totalPaymentRequested || 0);
    const isExhausted = remaining <= 0;
    const exceedsRemaining = requestAmount != null && requestAmount > 0 && requestAmount > remaining;

    return (
        <div className="col-span-full space-y-2">
            <Label className="text-muted-foreground text-xs">PO Details</Label>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">PO Number:</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="font-medium">{getShortId(po.poNumber) || `#${po.id}`}</span>
                            </TooltipTrigger>
                            <TooltipContent>{po.poNumber}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total (Pre-GST):</span>
                    <span>{formatINR(po.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">GST Amount:</span>
                    <span>{formatINR(po.totalGstAmt || 0)}</span>
                </div>
                <div className="flex justify-between font-medium">
                    <span>Grand Total:</span>
                    <span>{formatINR(po.grandTotal || 0)}</span>
                </div>
                {po.tdsPercentage && Number(po.tdsPercentage) > 0 && (
                    <>
                        <div className="border-t my-1.5" />
                        <div className="flex justify-between text-destructive">
                            <span>TDS @ {Number(po.tdsPercentage)}%:</span>
                            <span>-{formatINR(po.tdsAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>Amount After TDS:</span>
                            <span>{formatINR(po.amountAfterTds || 0)}</span>
                        </div>
                    </>
                )}
                <div className="border-t my-1.5" />
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Requested:</span>
                    <span>{formatINR(po.totalPaymentRequested || 0)}</span>
                </div>
                <div className="flex justify-between pl-2 text-muted-foreground">
                    <span>Maker Done:</span>
                    <span>{formatINR(po.totalMakerDone || 0)}</span>
                </div>
                <div className="flex justify-between pl-2 text-muted-foreground">
                    <span>Payment Done:</span>
                    <span>{formatINR(po.totalPaymentDone || 0)}</span>
                </div>
                <div className={`flex justify-between font-medium ${isExhausted ? "text-destructive" : ""}`}>
                    <span>Remaining:</span>
                    <span>{formatINR(remaining)}</span>
                </div>
                {isExhausted && (
                    <p className="text-destructive text-xs font-medium mt-1">
                        No remaining balance available for this PO
                    </p>
                )}
                {exceedsRemaining && (
                    <p className="text-destructive text-xs font-medium mt-1">
                        Requested amount ({formatINR(requestAmount!)}) exceeds remaining balance ({formatINR(remaining)})
                    </p>
                )}
                <div className="pt-2">
                    <a
                        href={purchaseOrderApi.getPurchaseOrderPdfUrl(po.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-xs"
                    >
                        View Latest PO PDF
                    </a>
                </div>
            </div>
        </div>
    );
};
