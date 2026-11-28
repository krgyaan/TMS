import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
    useAccountApproveVoucher,
    useAdminApproveVoucher,
    useDownloadVoucherPdf,
    useInfiniteLedgerOptions,
    useSaveVoucherLedgers,
    useVoucherLedgerReview,
} from "@/hooks/api/imprest.hooks";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import type { LedgerOption, VoucherLedgerInfo, VoucherLedgerReviewItem } from "./helpers/imprest.types";
import { ImprestProofs } from "./components/ImprestProofs";
import { AlertCircle, ArrowLeft, Check, CheckCircle, ChevronsUpDown, Download, Loader2, Save } from "lucide-react";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";


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

    const { data, isLoading, error, refetch } = useVoucherLedgerReview(voucherId);
    const saveMutation = useSaveVoucherLedgers(voucherId);
    const downloadPdfMutation = useDownloadVoucherPdf();
    const accountApproveMutation = useAccountApproveVoucher();
    const adminApproveMutation = useAdminApproveVoucher();
    const [drafts, setDrafts] = React.useState<Record<number, LedgerDraft>>({});
    const [accModalOpen, setAccModalOpen] = React.useState(false);
    const [adminModalOpen, setAdminModalOpen] = React.useState(false);
    const [remark, setRemark] = React.useState("");
    const [accApprove, setAccApprove] = React.useState(false);
    const [adminApprove, setAdminApprove] = React.useState(false);

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

    const resetApprovalForm = () => {
        setRemark("");
        setAccApprove(false);
        setAdminApprove(false);
    };

    const openAccountsModal = () => {
        setRemark(voucher.accountsRemark ?? "");
        setAccApprove(false);
        setAccModalOpen(true);
    };

    const openAdminModal = () => {
        setRemark(voucher.adminRemark ?? "");
        setAdminApprove(false);
        setAdminModalOpen(true);
    };

    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        accountApproveMutation.mutate(
            { id: voucher.id, remark, approve: accApprove },
            {
                onSuccess: () => {
                    setAccModalOpen(false);
                    resetApprovalForm();
                    void refetch();
                },
            }
        );
    };

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        adminApproveMutation.mutate(
            { id: voucher.id, remark, approve: adminApprove },
            {
                onSuccess: () => {
                    setAdminModalOpen(false);
                    resetApprovalForm();
                    void refetch();
                },
            }
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
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadPdfMutation.isPending}
                            onClick={() => downloadPdfMutation.mutate({ voucherId: voucher.id, voucherCode: voucher.voucherCode })}
                        >
                            {downloadPdfMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                            Download PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-1 h-4 w-4" /> Back
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

                {/* Voucher header (mirrors the voucher view page) */}
                <div className="rounded-lg border">
                    <div className="border-b p-4">
                        <h3 className="text-base font-semibold">Volks Energie Pvt Ltd</h3>
                        <p className="text-xs text-muted-foreground">Solar and Air Conditioning Contractor</p>
                        <p className="text-xs text-muted-foreground">New Delhi - 110044</p>
                        <p className="text-xs text-muted-foreground">Ph: +91-8882591733 | E-mail: accounts@volksenergie.in</p>
                    </div>
                    <div className="border-b p-3 text-center text-base font-semibold">Expense Report</div>
                    <div className="grid gap-2 border-b p-4 text-sm sm:grid-cols-2">
                        <div>
                            FROM <b>{formatDate(voucher.validFrom)}</b> TO <b>{formatDate(voucher.validTo)}</b>
                        </div>
                        <div className="sm:text-right">
                            <b>Voucher No: {voucher.voucherCode}</b>
                        </div>
                    </div>
                    <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
                        <div>
                            Employee Name:
                            <br />
                            <b>{voucher.beneficiaryName ?? voucher.employeeName ?? "—"}</b>
                        </div>
                        <div>
                            Employee ID:
                            <br />
                            <b>ID00{voucher.beneficiaryId}</b>
                        </div>
                        <div>
                            Team Name:
                            <br />
                            <b>{voucher.teamName ?? "—"}</b>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="p-2">Sr.No.</th>
                                <th className="p-2">D.O.E.</th>
                                <th className="p-2">Category</th>
                                <th className="p-2">Project</th>
                                <th className="p-2">Remarks</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2 min-w-[220px]">Ledger</th>
                                <th className="p-2">Proofs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, index) => {
                                const value = currentValue(item);
                                const selectedName = currentName(item);
                                const dirty = hasDraft(item) && drafts[item.id].ledgerId !== item.tallyLedgerId;

                                return (
                                    <tr key={item.id} className="border-b align-top">
                                        <td className="p-2 whitespace-nowrap">{index + 1}</td>
                                        <td className="p-2 whitespace-nowrap">{item.dateOfExpense ? formatDate(item.dateOfExpense) : "—"}</td>
                                        <td className="p-2">{item.category ?? "—"}</td>
                                        <td className="p-2">
                                            <div>{item.projectName ?? "—"}</div>
                                            <div className="text-xs text-muted-foreground">{item.projectCode ?? "—"}</div>
                                        </td>
                                        <td className="p-2">{item.remark ?? "—"}</td>
                                        <td className="p-2 whitespace-nowrap text-right">{formatINR(item.amount)}</td>
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
                                            <ImprestProofs proofs={item.invoiceProof} />
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="border-t-2 font-semibold">
                                <td colSpan={5} className="p-2 text-right">
                                    Total
                                </td>
                                <td className="p-2 whitespace-nowrap text-right">
                                    {formatINR(data.items.reduce((sum, entry) => sum + entry.amount, 0))}
                                </td>
                                <td className="p-2" />
                                <td className="p-2" />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Voucher footer (mirrors the voucher view page) */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border p-4">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr>
                                    <th className="py-1 text-left font-medium">Prepared By:</th>
                                    <td className="py-1">{voucher.beneficiaryName ?? voucher.employeeName ?? "—"}</td>
                                    <th className="py-1 text-left font-medium">Date:</th>
                                    <td className="py-1" />
                                </tr>
                                <tr>
                                    <th className="py-1 text-left font-medium">Checked By:</th>
                                    <td className="py-1">{voucher.accountsSignedBy ? "—" : <i>to be signed</i>}</td>
                                    <th className="py-1 text-left font-medium">Date:</th>
                                    <td className="py-1">{formatDate(voucher.accountsSignedAt)}</td>
                                </tr>
                                <tr>
                                    <th className="py-1 text-left font-medium">Approved By:</th>
                                    <td className="py-1">{voucher.adminSignedBy ? "—" : <i>to be signed</i>}</td>
                                    <th className="py-1 text-left font-medium">Date:</th>
                                    <td className="py-1">{formatDate(voucher.adminSignedAt)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-lg border p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accounts Comment</p>
                            <p className="mt-1 text-sm">
                                {voucher.accountsRemark || <span className="italic text-muted-foreground">No comment added</span>}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CEO Comment</p>
                            <p className="mt-1 text-sm">
                                {voucher.adminRemark || <span className="italic text-muted-foreground">No comment added</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Approval actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant={voucher.accountsSignedBy ? "secondary" : "outline"}>
                            {voucher.accountsSignedBy ? "Approved by Accounts" : "Accounts approval pending"}
                        </Badge>
                        <Badge variant={voucher.adminSignedBy ? "secondary" : "outline"}>
                            {voucher.adminSignedBy ? "Approved by CEO" : "CEO approval pending"}
                        </Badge>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <Button variant="default" size="sm" onClick={openAccountsModal}>
                                <CheckCircle className="mr-1 h-4 w-4" /> Approve by Accounts
                            </Button>
                            <Button variant="default" size="sm" onClick={openAdminModal}>
                                <CheckCircle className="mr-1 h-4 w-4" /> Approve by CEO
                            </Button>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 p-3 backdrop-blur">
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

            {/* Accounts Approval Modal */}
            <Dialog open={accModalOpen} onOpenChange={setAccModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Accounts Approval</DialogTitle>
                        <DialogDescription>Add an optional remark and confirm your approval for this imprest voucher.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAccountSubmit} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Remark (Optional)</label>
                            <Textarea
                                placeholder="Add any comments or notes here..."
                                value={remark}
                                onChange={e => setRemark(e.target.value)}
                                className="h-24 resize-none p-2"
                            />
                        </div>

                        {!voucher.accountsSignedBy ? (
                            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                                <input
                                    type="checkbox"
                                    id="acc-approve"
                                    checked={accApprove}
                                    onChange={e => setAccApprove(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="acc-approve" className="cursor-pointer text-sm font-medium leading-none">
                                    Approve Voucher
                                </label>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Already Approved by Accounts</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setAccModalOpen(false)} className="w-24">
                                Cancel
                            </Button>
                            <Button type="submit" className="w-32" disabled={accountApproveMutation.isPending}>
                                {accountApproveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* CEO Approval Modal */}
            <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">CEO Approval</DialogTitle>
                        <DialogDescription>Add an optional remark and confirm your approval for this imprest voucher.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAdminSubmit} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Remark (Optional)</label>
                            <Textarea
                                placeholder="Add any comments or notes here..."
                                value={remark}
                                onChange={e => setRemark(e.target.value)}
                                className="h-24 resize-none p-2"
                            />
                        </div>

                        {!voucher.adminSignedBy ? (
                            <div className={`flex items-start gap-3 rounded-lg border p-4 ${!voucher.accountsSignedBy ? "bg-muted/60 opacity-80" : "bg-muted/40"}`}>
                                <input
                                    type="checkbox"
                                    id="admin-approve"
                                    checked={adminApprove}
                                    disabled={!voucher.accountsSignedBy}
                                    onChange={e => setAdminApprove(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                                />
                                <div className="space-y-1">
                                    <label htmlFor="admin-approve" className={`text-sm font-medium leading-none ${!voucher.accountsSignedBy ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                        Approve this voucher
                                    </label>
                                    {!voucher.accountsSignedBy && <p className="mt-1 text-xs font-medium text-destructive">Accounts approval is required first.</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Already Approved by CEO</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setAdminModalOpen(false)} className="w-24">
                                Cancel
                            </Button>
                            <Button type="submit" className="w-32" disabled={adminApproveMutation.isPending}>
                                {adminApproveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default VoucherLedgerReviewPage;
