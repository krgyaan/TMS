import { useMemo, useState, type ReactNode } from "react";
import { paths } from "@/app/routes/paths";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Search } from "lucide-react";
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
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredTenders = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return tenders;
        return tenders.filter(tender => `${tender.tenderName} ${tender.tenderNo}`.toLowerCase().includes(term));
    }, [search, tenders]);

    const isSearching = search.trim().length > 0;

    return (
        <Popover
            open={open}
            onOpenChange={nextOpen => {
                setOpen(nextOpen);
                if (!nextOpen) setSearch("");
            }}
        >
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent className="w-96 max-h-80 overflow-hidden p-0" align="center">
                <div className="space-y-2 border-b p-3">
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-muted-foreground">
                            {isSearching ? `Showing ${filteredTenders.length} of ${tenders.length} tenders` : `${tenders.length} tenders`}
                        </p>
                    </div>

                    {tenders.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                onClick={event => event.stopPropagation()}
                                placeholder="Search tenders..."
                                className="h-8 pl-7 text-xs"
                            />
                        </div>
                    )}
                </div>

                <div className="max-h-56 overflow-auto p-3">
                    {tenders.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">No tenders</p>
                    ) : filteredTenders.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">No matching tenders</p>
                    ) : (
                        <div className="space-y-2">
                            {filteredTenders.map(tender => (
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
                </div>
            </PopoverContent>
        </Popover>
    );
}
