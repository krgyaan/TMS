import type { ReactNode } from "react";
import { paths } from "@/app/routes/paths";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type ScoreDrilldownTender = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    value: number;
    date: string | null;
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
};

export function ScoreDrilldownPopover({ title, tenders, trigger }: { title: string; tenders: ScoreDrilldownTender[]; trigger: ReactNode }) {
    const navigate = useNavigate();

    return (
        <Popover>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent className="w-96 max-h-72 overflow-auto p-3" align="center">
                <div className="mb-2 space-y-0.5">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{tenders.length} tenders</p>
                </div>

                {tenders.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">No tenders</p>
                ) : (
                    <div className="space-y-2">
                        {tenders.map(tender => (
                            <div key={`${tender.tenderId}-${tender.tenderNo}`} className="flex items-start justify-between gap-2 border-b pb-2 text-xs last:border-0">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{tender.tenderName}</p>
                                    <p className="truncate text-muted-foreground">{tender.tenderNo}</p>
                                    <p className="text-muted-foreground">
                                        {tender.value ? formatCurrency(tender.value) : "—"} · {formatDate(tender.date)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={event => {
                                        event.stopPropagation();
                                        navigate(paths.tendering.tenderView(tender.tenderId));
                                    }}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
