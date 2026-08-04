import React, { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINR } from "@/hooks/useINRFormatter";

interface OrderProgressCellProps {
    paid?: number;
    invoiced?: number;
    paymentBase?: number;
}

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

        const leftToInvoice = Math.max(0, base - invoicedAmount);

        return {
            paidAmount,
            invoicedAmount,
            paymentPct,
            invoicePct,
            leftToInvoice,
        };
    }, [paid, invoiced, paymentBase]);

    const { paidAmount, invoicedAmount, paymentPct, invoicePct, leftToInvoice } = metrics;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-full min-w-[100px] cursor-default py-1" role="img" aria-label={`Payment ${Math.round(paymentPct)}%, Invoiced ${Math.round(invoicePct)}%`}>
                        <div className="flex flex-col gap-1 w-full">

                            {/* Paid Bar Track */}
                            <div className="h-1.5 w-full overflow-hidden rounded bg-muted-foreground/20 dark:bg-muted-foreground/30">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${paymentPct}%` }}
                                />
                            </div>

                            {/* Invoiced Bar Track */}
                            <div className="h-1.5 w-full overflow-hidden rounded bg-muted-foreground/20 dark:bg-muted-foreground/30">
                                <div
                                    className="h-full bg-sky-500 transition-all duration-300"
                                    style={{ width: `${invoicePct}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>

                <TooltipContent side="top" align="start" className="max-w-xs">
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
                            <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground" />
                            <dt className="font-semibold">Left to Invoice:</dt>
                            <dd>{formatINR(leftToInvoice)}</dd>
                        </div>
                    </dl>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};