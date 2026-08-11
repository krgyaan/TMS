import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { EmployeeImprestDashboardSummaryDto } from "../helpers/imprest.types";
import { cn } from "@/lib/utils";

const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

export const SummaryCards: React.FC<{
    summary: EmployeeImprestDashboardSummaryDto;
    isMobile: boolean;
}> = ({ summary, isMobile }) => {
    if (isMobile) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="p-5 space-y-3">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground ">Amount Left</p>
                        <p className="text-2xl font-semibold tabular-nums mt-1">{formatINR(summary.amountLeft)}</p>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Amount Spent</span>
                            <span className="font-medium tabular-nums">{formatINR(summary.amountSpent)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Amount Approved</span>
                            <span className="font-medium tabular-nums">{formatINR(summary.amountApproved)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Amount Received</span>
                            <span className="font-medium tabular-nums">{formatINR(summary.amountReceived)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border shadow-sm">
            <CardContent className="p-2 pl-5">
                <div className="grid grid-cols-4 gap-3 items-center">
                    <div className="col-span-3 grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Spent</p>
                            <p className="text-lg font-medium tabular-nums mt-2">{formatINR(summary.amountSpent)}</p>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Approved</p>
                            <p className="text-lg font-medium tabular-nums mt-2">{formatINR(summary.amountApproved)}</p>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Received</p>
                            <p className="text-lg font-medium tabular-nums mt-2">{formatINR(summary.amountReceived)}</p>
                        </div>
                    </div>

                    <div className={cn("col-span-1")}>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Left</p>
                        <p className="text-xl font-semibold tabular-nums mt-2">{formatINR(summary.amountLeft)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};