import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteLedgerOptions, useSaveVoucherLedgers, useVoucherLedgerReview } from "@/hooks/api/imprest.hooks";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import type { LedgerOption, VoucherLedgerInfo, VoucherLedgerReviewItem } from "./helpers/imprest.types";
import { AlertCircle, ArrowLeft, Check, ChevronsUpDown, Loader2, Save } from "lucide-react";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const CONTEXT_LABEL: Record<VoucherLedgerReviewItem["context"], string> = {
    default: "Default",
    project: "Project",
    business_development: "BD",
};

const PROBLEM_LABEL: Record<NonNullable<VoucherLedgerReviewItem["problem"]>, string> = {
    BLOCKED: "Category blocked",
    UNMAPPED: "No ledger",
    INACTIVE: "Inactive ledger",
};

type LedgerDraft = { ledgerId: number | null; ledgerName: string | null };

function LedgerPicker({
    value,
    selectedName,
    candidates,
    autoLabel,
    disabled,
    onChange,
}: {
    value: number | null;
    selectedName: string | null;
    candidates: VoucherLedgerInfo[];
    autoLabel: string | null;
    disabled?: boolean;
    onChange: (value: number | null, name: string | null) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const debounced = useDebouncedSearch(query, 300);
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteLedgerOptions(debounced, open);
    const options = data?.pages.flatMap(page => page.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;

    const merged: Array<Pick<LedgerOption, "id" | "name" | "parent">> = [...candidates, ...options].filter(
        (option, index, all) => all.findIndex(candidate => candidate.id === option.id) === index
    );
    const selected = merged.find(option => option.id === value);
    const label = value === null ? (autoLabel ? `Auto: ${autoLabel}` : "Auto") : (selectedName ?? selected?.name ?? `Ledger #${value}`);

    const choose = (next: number | null, name: string | null) => {
        onChange(next, name);
        setOpen(false);
        setQuery("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between font-normal" disabled={disabled}>
                    <span className="truncate">{label}</span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="Search all ledgers..." value={query} onValueChange={setQuery} />
                    <CommandList>
                        <CommandEmpty>No ledger found.</CommandEmpty>
                        <CommandGroup heading="Suggested">
                            <CommandItem value="__auto__" onSelect={() => choose(null, null)}>
                                <Check className={value === null ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                                Auto{autoLabel ? `: ${autoLabel}` : ""}
                            </CommandItem>
                            {candidates.map(candidate => (
                                <CommandItem key={candidate.id} value={`${candidate.name} ${candidate.id}`} onSelect={() => choose(candidate.id, candidate.name)}>
                                    <Check className={value === candidate.id ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                                    <span className="truncate">{candidate.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {options.length > 0 && (
                            <CommandGroup heading={`All ledgers${total > 0 ? ` — ${options.length} of ${total}` : ""}`}>
                                {options
                                    .filter(option => !candidates.some(candidate => candidate.id === option.id))
                                    .map(option => (
                                        <CommandItem key={option.id} value={`${option.name} ${option.id}`} onSelect={() => choose(option.id, option.name)}>
                                            <Check className={value === option.id ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                                            <span className="truncate">{option.name}</span>
                                        </CommandItem>
                                    ))}
                            </CommandGroup>
                        )}
                        {hasNextPage && (
                            <div className="border-t p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    disabled={isFetchingNextPage}
                                    onClick={() => {
                                        void fetchNextPage();
                                    }}
                                >
                                    {isFetchingNextPage ? "Loading…" : `Load more (${Math.max(0, total - options.length)} remaining)`}
                                </Button>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const VoucherLedgerReviewPage: React.FC = () => {
    const { voucherId: voucherIdParam } = useParams<{ voucherId: string }>();
    const voucherId = Number(voucherIdParam);
    const navigate = useNavigate();
    const { canRead, canUpdate } = useAuth();
    const canEdit = canUpdate("accounts.imprests") && canRead("accounts.imprests");

    const { data, isLoading, error } = useVoucherLedgerReview(voucherId);
    const saveMutation = useSaveVoucherLedgers(voucherId);
    const [drafts, setDrafts] = React.useState<Record<number, LedgerDraft>>({});

    React.useEffect(() => {
        setDrafts({});
    }, [data]);

    if (!canRead("accounts.imprests")) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">You do not have permission to review Tally ledgers.</CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading voucher ledgers…
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 p-8 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> Failed to load the voucher ledger review.
                </CardContent>
            </Card>
        );
    }

    const voucher = data.voucher;
    const editable = data.editable && canEdit;
    const hasDraft = (item: VoucherLedgerReviewItem) => Object.prototype.hasOwnProperty.call(drafts, item.id);
    const currentValue = (item: VoucherLedgerReviewItem) => (hasDraft(item) ? drafts[item.id].ledgerId : item.tallyLedgerId);
    const currentName = (item: VoucherLedgerReviewItem) =>
        hasDraft(item) ? drafts[item.id].ledgerName : item.tallyLedgerId === null ? null : (item.overrideLedger?.name ?? null);
    const changed = data.items.filter(item => hasDraft(item) && drafts[item.id].ledgerId !== item.tallyLedgerId);

    const save = () => {
        if (changed.length === 0) return;
        saveMutation.mutate(
            changed.map(item => ({ imprestId: item.id, ledgerId: drafts[item.id].ledgerId })),
            { onSuccess: () => setDrafts({}) }
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Tally Ledger Review
                            <Badge variant="outline">{voucher.voucherCode}</Badge>
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {voucher.employeeName ?? "Employee"} · {formatDate(voucher.validFrom)} → {formatDate(voucher.validTo)} · {formatINR(voucher.amount)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">Total {data.summary.total}</Badge>
                            <Badge variant="outline">Auto {data.summary.auto}</Badge>
                            <Badge variant="outline">Manual {data.summary.manual}</Badge>
                            {data.summary.blocked > 0 && <Badge variant="destructive">Blocked {data.summary.blocked}</Badge>}
                            {data.summary.unmapped > 0 && <Badge variant="destructive">Unmapped {data.summary.unmapped}</Badge>}
                            {data.summary.inactive > 0 && <Badge variant="destructive">Inactive {data.summary.inactive}</Badge>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                navigate(
                                    paths.accounts.imprestsVoucherView({
                                        userId: voucher.beneficiaryId,
                                        from: voucher.validFrom,
                                        to: voucher.validTo,
                                    })
                                )
                            }
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Voucher
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!data.editable && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4" /> {data.lockReason ?? "This voucher is locked."}
                    </div>
                )}
                {data.editable && !canEdit && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4" /> You can review the ledgers but not change them.
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="p-2">Date</th>
                                <th className="p-2">Category</th>
                                <th className="p-2">Project / Cost centre</th>
                                <th className="p-2">Context</th>
                                <th className="p-2">Auto ledger</th>
                                <th className="p-2 min-w-[220px]">Final ledger</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map(item => {
                                const value = currentValue(item);
                                const selectedName = currentName(item);
                                const dirty = hasDraft(item) && drafts[item.id].ledgerId !== item.tallyLedgerId;

                                return (
                                    <tr key={item.id} className="border-b align-top">
                                        <td className="p-2 whitespace-nowrap">{item.dateOfExpense ? formatDate(item.dateOfExpense) : "—"}</td>
                                        <td className="p-2">
                                            <div className="font-medium">{item.category ?? "—"}</div>
                                            <div className="text-xs text-muted-foreground">{formatINR(item.amount)}</div>
                                        </td>
                                        <td className="p-2">
                                            <div>{item.projectName ?? "—"}</div>
                                            <div className="text-xs text-muted-foreground">{item.projectCode ?? "—"}</div>
                                        </td>
                                        <td className="p-2">
                                            <Badge variant={item.context === "business_development" ? "default" : "outline"}>{CONTEXT_LABEL[item.context]}</Badge>
                                        </td>
                                        <td className="p-2">
                                            <div className="text-xs">{item.autoLedger?.name ?? "—"}</div>
                                            <div className="text-[11px] text-muted-foreground">{item.autoLedger?.parent ?? ""}</div>
                                        </td>
                                        <td className="p-2">
                                            <LedgerPicker
                                                value={value}
                                                selectedName={selectedName}
                                                candidates={item.candidates}
                                                autoLabel={item.autoLedger?.name ?? null}
                                                disabled={!editable}
                                                onChange={(next, name) =>
                                                    setDrafts(previous => ({
                                                        ...previous,
                                                        [item.id]: { ledgerId: next, ledgerName: name },
                                                    }))
                                                }
                                            />
                                            {dirty && <div className="mt-1 text-[11px] text-amber-600">Unsaved change</div>}
                                        </td>
                                        <td className="p-2">
                                            {item.problem ? (
                                                <Badge variant="destructive">{PROBLEM_LABEL[item.problem]}</Badge>
                                            ) : item.ledgerSource === "manual" ? (
                                                <Badge>Manual</Badge>
                                            ) : (
                                                <Badge variant="secondary">Auto</Badge>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 py-3 backdrop-blur">
                    <div className="text-sm text-muted-foreground">
                        {changed.length > 0 ? `${changed.length} unsaved change(s)` : "No unsaved changes"}
                        {saveMutation.error ? <span className="ml-2 text-destructive">Save failed.</span> : null}
                    </div>
                    <Button onClick={save} disabled={!editable || changed.length === 0 || saveMutation.isPending}>
                        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save ledger mapping
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default VoucherLedgerReviewPage;
