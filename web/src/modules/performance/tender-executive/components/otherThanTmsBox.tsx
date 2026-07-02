import { TableCell } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

function isReturned(instrumentType: string, action: number): boolean {
    if (["DD", "FDR"].includes(instrumentType)) return [3, 4, 5, 6, 7].includes(action);
    if (["Portal Payment", "Bank Transfer"].includes(instrumentType)) return [3, 4].includes(action);
    if (instrumentType === "BG") return [8, 9].includes(action);
    return false;
}

export function OtherThanTmsBox({ entries }: { entries: any[] }) {
    if (!entries?.length) {
        return <TableCell className="text-center text-muted-foreground">·</TableCell>;
    }

    const total = entries.reduce((s, e) => s + Number(e.value ?? 0), 0);

    return (
        <TableCell className="text-center">
            <Popover>
                <PopoverTrigger asChild>
                    <div className="mx-auto flex flex-col items-center justify-center min-w-[64px] px-3 py-1 rounded-xl cursor-pointer text-sm font-bold bg-muted">
                        <span>{entries.length}</span>
                        <span className="text-[11px] font-normal text-muted-foreground">{formatCurrency(total)}</span>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-96 max-h-72 overflow-auto">
                    <div className="space-y-2">
                        <div className="font-semibold text-sm">
                            {entries.length} EMDs · {formatCurrency(total)}
                        </div>

                        {entries.map(e => {
                            const returned = isReturned(e.instrumentType, e.action);
                            return (
                                <div key={`${e.requestId}-${e.instrumentType}`} className="border-b pb-2 text-xs space-y-1 flex justify-between gap-2 items-center">
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">{e.name ?? `Request #${e.requestId}`}</div>
                                        <div className="text-muted-foreground">
                                            {e.instrumentType} · {formatCurrency(e.value)}
                                        </div>
                                    </div>

                                    {returned ? (
                                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 gap-1 shrink-0">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Returned
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 shrink-0">
                                            <Clock className="h-3 w-3" />
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </TableCell>
    );
}
