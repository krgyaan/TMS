import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

export function ColumnHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex items-center justify-center gap-1">
            <span className="font-semibold">{title}</span>
            <Tooltip>
                <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
            </Tooltip>
        </div>
    );
}
