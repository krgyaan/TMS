import { useEmdCashFlow } from "@/hooks/api/useTenderExecutivePerformance";
import { formatCurrency } from "./emd-helpers";

export function EmdTotalsSummary(props: { view: "user" | "team" | "all"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
    const { data } = useEmdCashFlow(props);
    if (!data?.lifetime) return null;

    return (
        <p className="px-2 py-3 text-xs text-muted-foreground">
            <span>Total EMD Paid: {data.lifetime.paid.count} ({formatCurrency(data.lifetime.paid.value)})</span>
            <span className="mx-2">·</span>
            <span>Total EMD Received: {data.lifetime.received.count} ({formatCurrency(data.lifetime.received.value)})</span>
        </p>
    );
}
