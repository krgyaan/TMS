import { TableCell } from "@/components/ui/table";
import type { MetricBucket } from "../helpers/tender-executive.types";
import { ScoreDrilldownPopover } from "./ScoreDrilldownPopover";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

export function MetricCell({ data, strong = false }: { data: MetricBucket; strong?: boolean }) {
    if (!data || data.count === 0) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    const tenders = data.drilldown.map(item => ({
        tenderId: item.tenderId,
        tenderNo: item.tenderNo ?? `Tender #${item.tenderId}`,
        tenderName: item.tenderName ?? "Tender name unavailable",
        value: item.value,
        date: item.transferDate ?? null,
    }));

    return (
        <TableCell className="text-center">
            <ScoreDrilldownPopover
                title={`${data.count} tenders · ${formatCurrency(data.value)}`}
                tenders={tenders}
                trigger={
                    <div
                        className={`mx-auto flex min-w-[64px] cursor-pointer flex-col items-center justify-center rounded-xl px-3 py-1 text-sm font-bold ${
                            strong ? "bg-primary/10 text-primary" : "bg-muted"
                        }`}
                    >
                        <span>{data.count}</span>
                        <span className="text-[11px] font-normal text-muted-foreground">{formatCurrency(data.value)}</span>
                    </div>
                }
            />
        </TableCell>
    );
}
