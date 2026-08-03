import React, { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINR } from "@/hooks/useINRFormatter";

interface OrderProgressCellProps {
    /** Amount actually paid (sum of 'payment_done' payment requests). */
    paid?: number;
    /** Total amount invoiced against the order. */
    invoiced?: number;
    /** Base used for percentages (amount after TDS); percentages are 0 when <= 0. */
    paymentBase?: number;
}

/**
 * Calculates a percentage clamped between 0 and 100.
 */
function calcPct(value: number, base: number): number {
    if (base <= 0) return 0;
    return Math.min(100, Math.max(0, (value / base) * 100));
}

export const OrderProgressCell: React.FC<OrderProgressCellProps> = ({
    paid = 0,
    invoiced = 0,
    paymentBase = 0,
}) => {
    const metrics = useMemo(() => {
        const base = Number(paymentBase || 0);
        const paidAmount = Number(paid || 0);
        const invoicedAmount = Number(invoiced || 0);

        const paymentPct = calcPct(paidAmount, base);
        const invoicePct = calcPct(invoicedAmount, base);
        const invoicedWidth = Math.max(0, invoicePct - paymentPct);

        const leftToInvoice = Math.max(0, base - invoicedAmount);

        return {
            paidAmount,
            invoicedAmount,
            paymentPct,
            invoicePct,
            invoicedWidth,
            leftToInvoice,
        };
    }, [paid, invoiced, paymentBase]);

    const { paidAmount, invoicedAmount, paymentPct, invoicePct, invoicedWidth, leftToInvoice } = metrics;

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
                                {formatINR(paidAmount)}{" "}
                                <span className="text-muted-foreground">
                                    ({Math.round(paymentPct)}%)
                                </span>
                            </dd>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm bg-sky-500" />
                            <dt className="font-semibold">Invoiced:</dt>
                            <dd>
                                {formatINR(invoicedAmount)}{" "}
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