import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getShortId } from "@/lib/id-utils";
import { formatINR } from "@/hooks/useINRFormatter";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import type { VendorWorkOrderRow } from "@/modules/operations/vendor-work-orders/helpers/vwoForm.types";

interface VwoDetailsCardProps {
    vwo: VendorWorkOrderRow;
    requestAmount?: number | null;
}

export const VwoDetailsCard: React.FC<VwoDetailsCardProps> = ({ vwo, requestAmount }) => {
    const cap = vwo.amountAfterTds ? Number(vwo.amountAfterTds) : Number(vwo.grandTotal || 0);
    const remaining = cap - Number(vwo.totalPaymentRequested || 0);
    const isExhausted = remaining <= 0;
    const exceedsRemaining = requestAmount != null && requestAmount > 0 && requestAmount > remaining;

    return (
        <div className="col-span-full space-y-2">
            <Label className="text-muted-foreground text-xs">Work Order Details</Label>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">WO Number:</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="font-medium">{getShortId(vwo.woNumber) || `#${vwo.id}`}</span>
                            </TooltipTrigger>
                            <TooltipContent>{vwo.woNumber}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total (Pre-GST):</span>
                    <span>{formatINR(vwo.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">GST Amount:</span>
                    <span>{formatINR(vwo.totalGstAmt || 0)}</span>
                </div>
                <div className="flex justify-between font-medium">
                    <span>Grand Total:</span>
                    <span>{formatINR(vwo.grandTotal || 0)}</span>
                </div>
                {vwo.tdsPercentage && Number(vwo.tdsPercentage) > 0 && (
                    <>
                        <div className="border-t my-1.5" />
                        <div className="flex justify-between text-destructive">
                            <span>TDS @ {Number(vwo.tdsPercentage)}%:</span>
                            <span>-{formatINR(vwo.tdsAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>Amount After TDS:</span>
                            <span>{formatINR(vwo.amountAfterTds || 0)}</span>
                        </div>
                    </>
                )}
                <div className="border-t my-1.5" />
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Requested:</span>
                    <span>{formatINR(vwo.totalPaymentRequested || 0)}</span>
                </div>
                <div className="flex justify-between pl-2 text-muted-foreground">
                    <span>Payment Done:</span>
                    <span>{formatINR(vwo.totalPaymentDone || 0)}</span>
                </div>
                <div className={`flex justify-between font-medium ${isExhausted ? "text-destructive" : ""}`}>
                    <span>Remaining:</span>
                    <span>{formatINR(remaining)}</span>
                </div>
                {isExhausted && (
                    <p className="text-destructive text-xs font-medium mt-1">
                        No remaining balance available for this Work Order
                    </p>
                )}
                {exceedsRemaining && (
                    <p className="text-destructive text-xs font-medium mt-1">
                        Requested amount ({formatINR(requestAmount!)}) exceeds remaining balance ({formatINR(remaining)})
                    </p>
                )}
                <div className="pt-2">
                    <a
                        href={vendorWorkOrderApi.getPdfDownloadUrl(vwo.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-xs"
                    >
                        View Latest VWO PDF
                    </a>
                </div>
            </div>
        </div>
    );
};