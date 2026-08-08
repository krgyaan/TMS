import { useState } from "react";
import { ReceiptText, Banknote, ChevronDown, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/api/useUsers";
import { useAmc } from "@/hooks/api/useAmc";
import type { AmcBill, AmcBillDetail, AmcService } from "@/modules/services/amc/helpers/amc.types";
import { billFileUrl } from "@/modules/services/amc/helpers/amc.types";
import { parseFileMeta } from "@/modules/services/amc/helpers/amcFileMeta";
import { UploadedByTooltip } from "@/modules/services/amc/helpers/UploadedByMeta";

const STATUS_STYLES: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-800 border-amber-200",
    "Bill Submitted": "bg-blue-100 text-blue-800 border-blue-200",
    "Payment Received": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Follow-up": "bg-orange-100 text-orange-800 border-orange-200",
};

function FileList({
    paths,
    emptyLabel,
    users,
}: {
    paths: string[];
    emptyLabel: string;
    users?: Array<{ id: number; name: string }>;
}) {
    if (!paths.length) {
        return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
    }
    return (
        <div className="flex flex-wrap gap-2">
            {paths.map((path, idx) => {
                const meta = parseFileMeta(path);
                return (
                    <UploadedByTooltip key={idx} path={path} users={users}>
                        <a
                            href={billFileUrl(path)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium hover:underline"
                        >
                            <span className="max-w-[220px] truncate">{meta.displayName}</span>
                        </a>
                    </UploadedByTooltip>
                );
            })}
        </div>
    );
}

export function AmcBillingView({ billing }: { billing: AmcBillDetail }) {
    const { data: users = [] } = useUsers();

    const allocatedTeName = (() => {
        const teId = billing.amc?.allocatedTe;
        if (teId == null) return null;
        const user = users.find(u => u.id === teId);
        return user ? user.name : null;
    })();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>{billing.amc?.projectName ?? "Project"}</CardTitle>
                        <CardDescription>
                            Bill #{billing.billNo} — due {formatDate(billing.billDueDate)}
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            STATUS_STYLES[billing.status] ??
                            "bg-muted text-muted-foreground border-transparent"
                        }
                    >
                        {billing.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6">
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                TE
                            </TableCell>
                            <TableCell className="text-sm">{allocatedTeName ?? "—"}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Site
                            </TableCell>
                            <TableCell className="text-sm">
                                <div className="flex flex-col">
                                    <span>{billing.site?.name ?? "—"}</span>
                                    {billing.site?.address && (
                                        <span className="text-xs text-muted-foreground">
                                            {billing.site.address}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Contact
                            </TableCell>
                            <TableCell className="text-sm">
                                {billing.site?.contacts?.[0] ? (
                                    <div className="flex flex-col">
                                        <span>{billing.site.contacts[0].name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {billing.site.contacts[0].mobile}
                                        </span>
                                    </div>
                                ) : (
                                    "—"
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Service Engg Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {billing.amc?.serviceEngineers?.[0]?.name ?? "—"}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Bill Due Date
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(billing.billDueDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                Amount (Pre GST)
                            </TableCell>
                            <TableCell className="text-sm">
                                {billing.amount != null ? formatINR(billing.amount) : "—"}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <ReceiptText className="h-4 w-4" /> Invoices
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                <FileList paths={billing.invoices ?? []} emptyLabel="None" users={users} />
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4" /> Payment Receipts
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                <FileList paths={billing.paymentReceipts ?? []} emptyLabel="None" users={users} />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Services in this bill
                    </p>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Service No.</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {billing.services?.length ? (
                                    billing.services.map(service => (
                                        <TableRow key={service.id} className="hover:bg-muted/30">
                                            <TableCell>{service.serviceNo}</TableCell>
                                            <TableCell>{formatDate(service.serviceDueDate)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "capitalize",
                                                        service.status === "Done"
                                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                            : "bg-amber-100 text-amber-800 border-amber-200",
                                                    )}
                                                >
                                                    {service.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="text-center text-sm text-muted-foreground py-4"
                                        >
                                            No services assigned to this bill.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AmcBillingSection({ amcId }: { amcId: number }) {
    const { data: amc, isLoading } = useAmc(amcId);

    const [expandedSiteId, setExpandedSiteId] = useState<number | null>(null);
    const [expandedBillId, setExpandedBillId] = useState<number | null>(null);

    if (isLoading && !amc) {
        return <p className="text-sm text-muted-foreground">Loading billing details…</p>;
    }

    if (!amc) {
        return <p className="text-sm text-muted-foreground">AMC information not available.</p>;
    }

    const bills = amc.bills ?? [];
    const toggleBill = (billId: number) => setExpandedBillId(prev => (prev === billId ? null : billId));

    if (bills.length > 0) {
        return (
            <div className="space-y-4">
                {amc.sites.map(site => {
                    const siteBills = bills.filter(b => b.amcSiteId === site.id);
                    if (siteBills.length === 0) return null;
                    const total = siteBills.length;
                    const isOpen = expandedSiteId === site.id;
                    return (
                        <Collapsible
                            key={site.id}
                            open={isOpen}
                            onOpenChange={open => setExpandedSiteId(open ? site.id ?? null : null)}
                            className="rounded-lg border bg-card"
                        >
                            <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        {site.name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {total} {total === 1 ? "bill" : "bills"}
                                        </Badge>
                                        <ChevronDown
                                            className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform",
                                                isOpen && "rotate-180",
                                            )}
                                        />
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="border-t overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead>Bill No.</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Amount (Pre GST)</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Invoices</TableHead>
                                                <TableHead>Receipts</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {siteBills.map(bill => {
                                                const expanded = expandedBillId === bill.id;
                                                return (
                                                    <BillRow
                                                        key={bill.id}
                                                        bill={bill}
                                                        billServices={
                                                            amc.services?.filter(s => s.billId === bill.id) ?? []
                                                        }
                                                        total={total}
                                                        expanded={expanded}
                                                        onToggle={() => toggleBill(bill.id)}
                                                    />
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}
            </div>
        );
    }

    if (amc.billType === "constant") {
        return (
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableBody>
                        <TableRow className="hover:bg-muted/30">
                            <TableCell className="text-sm font-medium text-muted-foreground w-[18%]">
                                Bill Value
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-[32%]">
                                {amc.billValue != null ? formatINR(amc.billValue) : "—"}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40">
                        <TableHead>Bill Date / Quarter</TableHead>
                        <TableHead>Bill Value (Pre GST)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {amc.variableBills?.length ? (
                        amc.variableBills.map((b, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                                <TableCell>{formatDate(b.date || b.label)}</TableCell>
                                <TableCell>{b.amount != null ? formatINR(b.amount) : "—"}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={2}
                                className="text-center text-sm text-muted-foreground py-4"
                            >
                                No variable bills recorded.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function BillRow({
    bill,
    billServices,
    total,
    expanded,
    onToggle,
}: {
    bill: AmcBill;
    billServices: AmcService[];
    total: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const { data: users = [] } = useUsers();

    return (
        <>
            <TableRow
                onClick={onToggle}
                className={cn(
                    "hover:bg-muted/30 cursor-pointer transition-colors",
                    expanded && "bg-muted/30",
                )}
            >
                <TableCell className="font-medium tabular-nums">
                    {bill.billNo}/{total}
                </TableCell>
                <TableCell>{formatDate(bill.billDueDate)}</TableCell>
                <TableCell>{bill.amount != null ? formatINR(bill.amount) : "—"}</TableCell>
                <TableCell>
                    <Badge
                        variant="outline"
                        className={cn(
                            "font-medium",
                            STATUS_STYLES[bill.status] ?? "bg-muted text-muted-foreground border-transparent",
                        )}
                    >
                        {bill.status || "—"}
                    </Badge>
                </TableCell>
                <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                        <ReceiptText className="h-3.5 w-3.5 text-muted-foreground" />
                        {bill.invoices?.length ?? 0}
                    </span>
                </TableCell>
                <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                        <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                        {bill.paymentReceipts?.length ?? 0}
                    </span>
                </TableCell>
                <TableCell>
                    <div className="flex items-center justify-end">
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                expanded && "rotate-180",
                            )}
                        />
                    </div>
                </TableCell>
            </TableRow>
            {expanded && (
                <TableRow>
                    <TableCell colSpan={7} className="bg-muted/20 px-4 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-lg border bg-card p-4 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Invoices ({bill.invoices?.length ?? 0})
                                    </p>
                                    <FileList paths={bill.invoices ?? []} emptyLabel="No invoices uploaded." users={users} />
                                </div>
                                <div className="rounded-lg border bg-card p-4 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Payment Receipts ({bill.paymentReceipts?.length ?? 0})
                                    </p>
                                    <FileList
                                        paths={bill.paymentReceipts ?? []}
                                        emptyLabel="No receipts uploaded."
                                        users={users}
                                    />
                                </div>
                            </div>

                            {billServices.length ? (
                                <div className="rounded-lg border overflow-hidden">
                                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
                                        Services in this bill
                                    </p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/20">
                                                <TableHead>Service No.</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {billServices.map(service => (
                                                <TableRow key={service.id} className="hover:bg-muted/30">
                                                    <TableCell>{service.serviceNo}</TableCell>
                                                    <TableCell>{formatDate(service.serviceDueDate)}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "capitalize",
                                                                service.status === "Done"
                                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                                    : "bg-amber-100 text-amber-800 border-amber-200",
                                                            )}
                                                        >
                                                            {service.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : null}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
