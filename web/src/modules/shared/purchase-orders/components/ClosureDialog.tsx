import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/hooks/useINRFormatter";
import { paymentRequestApi } from "@/services/api/payment-request.api";
import { purchaseInvoiceApi } from "@/services/api/purchase-invoice.api";
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import React, { useState } from "react";

interface ClosureStatus {
    canClose: boolean;
    remainingPayments: Array<{
        id: number;
        requestNo: string;
        amount: string;
        status: string;
        paymentAgainst: string;
        purpose: string;
    }>;
    remainingInvoices: Array<{
        id: number;
        invoiceNo: string;
        valuePreGst: string;
        gstAmount: string;
        invoiceDate: string;
    }>;
    advancePaid: boolean;
}

interface PaymentEntry {
    paymentDate: string;
    amount: string;
    accountName: string;
    accountNo: string;
    ifsc: string;
    utr: string;
}

interface InvoiceEntry {
    category: string;
    invoiceDate: string;
    partyName: string;
    preGst: string;
    gst: string;
    invoiceFile: File | null;
}

interface ClosureDialogProps {
    rowId: number;
    rowLabel: string;
    projectId: number;
    sellerName: string;
    amountAfterTds: number | string;
    open: boolean;
    onClose: () => void;
    fetchClosureStatus: (id: number) => Promise<ClosureStatus>;
}

const INVOICE_CATEGORIES = [
    { value: "Supply", label: "Supply" },
    { value: "Service", label: "Service" },
    { value: "Freight", label: "Freight" },
    { value: "Admin/Misc.", label: "Admin/Misc." },
    { value: "Buyback/Sale", label: "Buyback/Sale" },
    { value: "GEM Charges", label: "GEM Charges" },
];

export const ClosureDialog: React.FC<ClosureDialogProps> = ({
    rowId,
    rowLabel,
    projectId,
    sellerName,
    amountAfterTds,
    open,
    onClose,
    fetchClosureStatus,
}) => {
    const [closureStatus, setClosureStatus] = useState<ClosureStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
    const [invoiceEntries, setInvoiceEntries] = useState<InvoiceEntry[]>([]);

    const handleCheckClosure = async () => {
        setLoading(true);
        try {
            const status = await fetchClosureStatus(rowId);
            setClosureStatus(status);
            if (!status.canClose) {
                if (status.remainingPayments.length > 0) {
                    setPaymentEntries(
                        status.remainingPayments.map((pr) => ({
                            paymentDate: "",
                            amount: pr.amount,
                            accountName: "",
                            accountNo: "",
                            ifsc: "",
                            utr: "",
                        }))
                    );
                }
                if (status.remainingInvoices.length > 0) {
                    setInvoiceEntries(
                        status.remainingInvoices.map((inv) => ({
                            category: "",
                            invoiceDate: inv.invoiceDate || "",
                            partyName: sellerName,
                            preGst: inv.valuePreGst || "",
                            gst: inv.gstAmount || "",
                            invoiceFile: null,
                        }))
                    );
                }
            }
        } catch (error) {
            console.error("Failed to check closure status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentChange = (index: number, field: keyof PaymentEntry, value: string) => {
        setPaymentEntries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
        );
    };

    const handleInvoiceChange = (index: number, field: keyof InvoiceEntry, value: string) => {
        setInvoiceEntries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
        );
    };

    const handleInvoiceFileChange = (index: number, file: File | null) => {
        setInvoiceEntries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, invoiceFile: file } : entry))
        );
    };

    const handleSubmitPayment = async () => {
        setSubmitting(true);
        try {
            for (const entry of paymentEntries) {
                if (!entry.paymentDate || !entry.amount || !entry.accountName || !entry.accountNo || !entry.ifsc) {
                    continue;
                }
                await paymentRequestApi.create({
                    projectId,
                    purchaseOrderId: rowId,
                    requestNo: "",
                    partyName: entry.accountName,
                    accountNumber: entry.accountNo,
                    ifsc: entry.ifsc,
                    amount: entry.amount,
                    paymentAgainst: "po",
                    paymentMode: "BANK_TRANSFER",
                    billFiles: [],
                    remark: `Payment entry from closure workflow for PO ${rowLabel}`,
                    requestedBy: 0,
                });
            }
            setPaymentEntries([]);
            setClosureStatus(null);
            await handleCheckClosure();
        } catch (error) {
            console.error("Failed to submit payment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitInvoice = async () => {
        setSubmitting(true);
        try {
            for (const entry of invoiceEntries) {
                if (!entry.category || !entry.invoiceDate || !entry.partyName || !entry.preGst || !entry.gst) {
                    continue;
                }
                const formData = new FormData();
                formData.append("projectId", String(projectId));
                formData.append("purchaseOrderId", String(rowId));
                formData.append("category", entry.category);
                formData.append("invoiceDate", entry.invoiceDate);
                formData.append("partyName", entry.partyName);
                formData.append("valuePreGst", entry.preGst);
                formData.append("gstAmount", entry.gst);
                if (entry.invoiceFile) {
                    formData.append("invoiceFile", entry.invoiceFile);
                }
                await purchaseInvoiceApi.create(formData);
            }
            setInvoiceEntries([]);
            setClosureStatus(null);
            await handleCheckClosure();
        } catch (error) {
            console.error("Failed to submit invoice:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const totalRemainingPayment = closureStatus?.remainingPayments.reduce(
        (sum, p) => sum + Number(p.amount || 0), 0
    ) || 0;

    const totalRemainingInvoice = closureStatus?.remainingInvoices.reduce(
        (sum, inv) => sum + Number(inv.valuePreGst || 0) + Number(inv.gstAmount || 0), 0
    ) || 0;

    const totalPaymentEntryAmount = paymentEntries.reduce(
        (sum, e) => sum + Number(e.amount || 0), 0
    );

    const totalInvoiceEntryAmount = invoiceEntries.reduce(
        (sum, e) => sum + Number(e.preGst || 0) + Number(e.gst || 0), 0
    );

    const hasPaymentEntries = paymentEntries.some(
        (e) => e.paymentDate && e.amount && e.accountName && e.accountNo && e.ifsc
    );

    const hasInvoiceEntries = invoiceEntries.some(
        (e) => e.category && e.invoiceDate && e.partyName && e.preGst && e.gst
    );

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Closure — {rowLabel}</DialogTitle>
                    <DialogDescription>
                        PO Amount After TDS: {formatINR(amountAfterTds)}
                    </DialogDescription>
                </DialogHeader>

                {!closureStatus ? (
                    <div className="flex justify-center py-6">
                        <Button onClick={handleCheckClosure} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Check Closure Status
                        </Button>
                    </div>
                ) : closureStatus.canClose ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <p className="text-lg font-semibold text-green-600">Ready to Close</p>
                        <p className="text-sm text-muted-foreground text-center">
                            All payments and invoices are settled. This PO can be closed.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {closureStatus.remainingPayments.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                    Remaining Payments ({closureStatus.remainingPayments.length})
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total remaining: {formatINR(totalRemainingPayment)}
                                </p>
                                <div className="mt-3 border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 border-b">
                                                <th className="text-left p-2 font-medium">Payment Date</th>
                                                <th className="text-left p-2 font-medium">Amount</th>
                                                <th className="text-left p-2 font-medium">Account Name</th>
                                                <th className="text-left p-2 font-medium">Account No.</th>
                                                <th className="text-left p-2 font-medium">IFSC</th>
                                                <th className="text-left p-2 font-medium">UTR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentEntries.map((entry, idx) => (
                                                <tr key={idx} className="border-b last:border-0">
                                                    <td className="p-2">
                                                        <Input
                                                            type="date"
                                                            value={entry.paymentDate}
                                                            onChange={(e) => handlePaymentChange(idx, "paymentDate", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={entry.amount}
                                                            onChange={(e) => handlePaymentChange(idx, "amount", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={entry.accountName}
                                                            onChange={(e) => handlePaymentChange(idx, "accountName", e.target.value)}
                                                            placeholder="Account name"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={entry.accountNo}
                                                            onChange={(e) => handlePaymentChange(idx, "accountNo", e.target.value)}
                                                            placeholder="Account no."
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={entry.ifsc}
                                                            onChange={(e) => handlePaymentChange(idx, "ifsc", e.target.value)}
                                                            placeholder="IFSC"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={entry.utr}
                                                            onChange={(e) => handlePaymentChange(idx, "utr", e.target.value)}
                                                            placeholder="UTR"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-muted-foreground">
                                        Entry total: {formatINR(totalPaymentEntryAmount)}
                                    </span>
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitPayment}
                                        disabled={!hasPaymentEntries || submitting}
                                    >
                                        {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        <Upload className="h-3 w-3 mr-1" />
                                        Submit Payment
                                    </Button>
                                </div>
                            </div>
                        )}

                        {closureStatus.remainingInvoices.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                    Remaining Invoices ({closureStatus.remainingInvoices.length})
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total remaining: {formatINR(totalRemainingInvoice)}
                                </p>
                                <div className="mt-3 border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 border-b">
                                                <th className="text-left p-2 font-medium">Category</th>
                                                <th className="text-left p-2 font-medium">Invoice Date</th>
                                                <th className="text-left p-2 font-medium">Party Name</th>
                                                <th className="text-left p-2 font-medium">Pre GST</th>
                                                <th className="text-left p-2 font-medium">GST</th>
                                                <th className="text-left p-2 font-medium">Upload File</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceEntries.map((entry, idx) => (
                                                <tr key={idx} className="border-b last:border-0">
                                                    <td className="p-2">
                                                        <Select
                                                            value={entry.category}
                                                            onValueChange={(v) => handleInvoiceChange(idx, "category", v)}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {INVOICE_CATEGORIES.map((cat) => (
                                                                    <SelectItem key={cat.value} value={cat.value}>
                                                                        {cat.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="date"
                                                            value={entry.invoiceDate}
                                                            onChange={(e) => handleInvoiceChange(idx, "invoiceDate", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            value={entry.partyName}
                                                            onChange={(e) => handleInvoiceChange(idx, "partyName", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={entry.preGst}
                                                            onChange={(e) => handleInvoiceChange(idx, "preGst", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={entry.gst}
                                                            onChange={(e) => handleInvoiceChange(idx, "gst", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0] || null;
                                                                handleInvoiceFileChange(idx, file);
                                                            }}
                                                            className="h-8"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-muted-foreground">
                                        Entry total: {formatINR(totalInvoiceEntryAmount)}
                                    </span>
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitInvoice}
                                        disabled={!hasInvoiceEntries || submitting}
                                    >
                                        {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        <FileUp className="h-3 w-3 mr-1" />
                                        Submit Invoice
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};