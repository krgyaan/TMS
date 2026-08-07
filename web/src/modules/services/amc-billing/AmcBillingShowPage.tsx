import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Loader2, ReceiptText, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAmcBilling } from "@/hooks/api/useAmcBilling";
import { paths } from "@/app/routes/paths";
import { ManageInvoicesModal } from "./components/ManageInvoicesModal";
import { ManageReceiptsModal } from "./components/ManageReceiptsModal";

const STATUS_STYLES: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-800 border-amber-200",
    "Bill Submitted": "bg-blue-100 text-blue-800 border-blue-200",
    "Payment Received": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Follow-up": "bg-orange-100 text-orange-800 border-orange-200",
};

const fmtDate = (value: string | null | undefined) =>
    value ? format(new Date(value), "MMM d, yyyy") : "—";

export default function AmcBillingShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const billingId = Number(id);

    const { data: billing, isLoading } = useAmcBilling(billingId);

    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!billing) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.amcBilling)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <p className="text-sm text-muted-foreground">Billing record not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(paths.services.amcBilling)}
                className="-ml-2"
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to AMC Billing
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{billing.amc?.projectName ?? "Project"}</CardTitle>
                            <CardDescription>
                                Bill #{billing.billNo} — due {fmtDate(billing.billDueDate)}
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
                                    TE Name
                                </TableCell>
                                <TableCell className="text-sm">{billing.amc?.teamName ?? "—"}</TableCell>
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
                                <TableCell className="text-sm">{fmtDate(billing.billDueDate)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Amount (Pre GST)
                                </TableCell>
                                <TableCell className="text-sm">{billing.amount ?? "—"}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Invoices
                                </TableCell>
                                <TableCell className="text-sm">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary">{billing.invoices?.length ?? 0}</Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setInvoiceModalOpen(true)}
                                            className="h-8"
                                        >
                                            <ReceiptText className="h-3.5 w-3.5 mr-1" /> Manage
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Payment Receipts
                                </TableCell>
                                <TableCell className="text-sm">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary">{billing.paymentReceipts?.length ?? 0}</Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setReceiptModalOpen(true)}
                                            className="h-8"
                                        >
                                            <Banknote className="h-3.5 w-3.5 mr-1" /> Manage
                                        </Button>
                                    </div>
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
                                                <TableCell>{fmtDate(service.serviceDueDate)}</TableCell>
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

            <ManageInvoicesModal
                open={invoiceModalOpen}
                onOpenChange={setInvoiceModalOpen}
                billingId={billingId}
            />
            <ManageReceiptsModal
                open={receiptModalOpen}
                onOpenChange={setReceiptModalOpen}
                billingId={billingId}
            />
        </div>
    );
}