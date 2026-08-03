import React, { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINR } from "@/hooks/useINRFormatter";
import type { PurchaseOrderRow } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";

interface PoProgressCellProps {
    row: PurchaseOrderRow;
}

/**
 * Calculates a percentage clamped between 0 and 100.
 */
function calcPct(value: number, base: number): number {
    if (base <= 0) return 0;
    return Math.min(100, Math.max(0, (value / base) * 100));
}

export const PoProgressCell: React.FC<PoProgressCellProps> = ({ row }) => {
    const metrics = useMemo(() => {
        const paymentBase = Number(row.amountAfterTds || 0);
        const paid = Number(row.totalPaymentDone || 0);
        const invoiced = Number(row.totalPiAmount || 0);

        const paymentPct = calcPct(paid, paymentBase);
        const invoicePct = calcPct(invoiced, paymentBase);
        const invoicedWidth = Math.max(0, invoicePct - paymentPct);

        const leftToInvoice = Math.max(0, paymentBase - invoiced);

        return {
            paid,
            invoiced,
            paymentPct,
            invoicePct,
            invoicedWidth,
            leftToInvoice,
        };
    }, [row]);

    const { paid, invoiced, paymentPct, invoicePct, invoicedWidth, leftToInvoice } = metrics;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="w-full min-w-[100px] cursor-default py-1"
                        role="img"
                        aria-label={`Payment ${Math.round(paymentPct)}%, Invoiced ${Math.round(invoicePct)}%`}
                    >
                        {/* Progress bar */}
                        <div className="flex h-2 w-full overflow-hidden rounded bg-red-200 dark:bg-red-800">
                            {/* Paid segment */}
                            <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${paymentPct}%` }}
                            />
                            {/* Invoiced-but-unpaid segment */}
                            <div
                                className="h-full bg-sky-500 transition-all duration-300"
                                style={{ width: `${invoicedWidth}%` }}
                            />
                        </div>
                    </div>
                </TooltipTrigger>

                <TooltipContent
                    side="top"
                    align="start"
                    className="max-w-xs dark:bg-accent"
                >
                    <dl className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                            <dt className="font-semibold">Payment Done:</dt>
                            <dd>
                                {formatINR(paid)}{" "}
                                <span className="text-muted-foreground">
                                    ({Math.round(paymentPct)}%)
                                </span>
                            </dd>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm bg-sky-500" />
                            <dt className="font-semibold">Invoiced:</dt>
                            <dd>
                                {formatINR(invoiced)}{" "}
                                <span className="text-muted-foreground">
                                    ({Math.round(invoicePct)}%)
                                </span>
                            </dd>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm bg-red-300 dark:bg-red-700" />
                            <dt className="font-semibold">Left to Invoice:</dt>
                            <dd>{formatINR(leftToInvoice)}</dd>
                        </div>
                    </dl>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};