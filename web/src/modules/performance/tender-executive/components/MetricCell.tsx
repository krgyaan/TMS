import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TableCell } from "@/components/ui/table";
import { Eye } from "lucide-react";
import { paths } from "@/app/routes/paths";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

export function MetricCell({ data, strong = false }: { data: any; strong?: boolean }) {
    if (!data || data.count === 0) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    return (
        <TableCell className="text-center">
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        className={`mx-auto flex flex-col items-center justify-center
                        min-w-[64px] px-3 py-1 rounded-xl cursor-pointer text-sm font-bold
                        ${strong ? "bg-primary/10 text-primary" : "bg-muted"}`}
                    >
                        <span>{data.count}</span>
                        <span className="text-[11px] font-normal text-muted-foreground">{formatCurrency(data.value)}</span>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-96 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">
                            {data.count} EMDs · {formatCurrency(data.value)}
                        </div>

                        {data.drilldown.map(e => (
                            <div key={`${e.tenderId}-${e.instrumentType}`} className="border-b pb-2 text-xs space-y-1 flex justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-medium truncate">{e.tenderNo ?? `Tender #${e.tenderId}`}</div>
                                    {e.tenderName && <div className="text-muted-foreground truncate">{e.tenderName}</div>}
                                    <div>
                                        {e.instrumentType} · {formatCurrency(e.amount)}
                                    </div>
                                </div>

                                <button
                                    onClick={ev => {
                                        ev.stopPropagation();
                                        window.open(paths.tendering.tenderView(e.tenderId), "_blank");
                                    }}
                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                    text-muted-foreground hover:text-primary hover:bg-muted"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </TableCell>
    );
}
