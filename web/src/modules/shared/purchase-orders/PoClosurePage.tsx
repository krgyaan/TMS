import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { tenderFilesService } from "@/services/api/tender-files.service";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    maker_done: { label: "Maker Done", variant: "secondary" },
    payment_done: { label: "Payment Done", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
};

const BUDGET_CATEGORIES = ["Supply", "Service", "Freight", "Admin/Misc.", "Buyback/Sale", "GEM Charges"];

interface PoClosureData {
    id: number;
    projectId: number;
    poNumber: string;
    sellerName?: string;
    projectName?: string;
    poDate?: string;
    poApproved?: boolean;
    amountAfterTds?: number | string;
    grandTotal: number;
    totalGst: number;
    totalPaymentDone: number;
    totalPiAmount: number;
    paymentRequests: Array<{
        id: number;
        requestNo?: string;
        partyName?: string;
        amount?: number | string;
        status: string;
        paymentMode?: string;
        paymentAgainst?: string;
        utrNumber?: string;
        createdAt?: string;
    }>;
    purchaseInvoices: Array<{
        id: number;
        invoiceNo?: string;
        category?: string;
        partyName?: string;
        valuePreGst?: number | string;
        gstAmount?: number | string;
        invoiceDate?: string;
        invoiceFile?: string;
    }>;
}

interface PaymentRow {
    paymentDate: string;
    amount: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    utr: string;
}

interface InvoiceRow {
    category: string;
    invoiceDate: string;
    partyName: string;
    valuePreGst: string;
    gstAmount: string;
    invoiceFile: string[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyPaymentRow = (): PaymentRow => ({
    paymentDate: todayISO(),
    amount: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    utr: "",
});

const emptyInvoiceRow = (): InvoiceRow => ({
    category: "",
    invoiceDate: todayISO(),
    partyName: "",
    valuePreGst: "",
    gstAmount: "",
    invoiceFile: [],
});

function FileUploadCell({ value, onChange }: { value: string[]; onChange: (paths: string[]) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const result = await tenderFilesService.upload([file], "tender-documents");
            if (result?.files?.length) {
                onChange([...value, result.files[0].path]);
            }
        } catch (err) {
            console.error("File upload failed", err);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                onChange={handleFile}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
            >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {value.length > 0 ? "Re-upload" : "Upload"}
            </Button>
            {value.map((p) => (
                <a
                    key={p}
                    href={tenderFilesService.getFileUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline truncate max-w-[110px]"
                >
                    {p.split("/").pop()}
                </a>
            ))}
        </div>
    );
}

const PoClosurePage: React.FC = () => {
    const { poId } = useParams<{ poId: string }>();
    const navigate = useNavigate();
    const id = Number(poId);

    const [po, setPo] = useState<PoClosureData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
    const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
    const [savingPayments, setSavingPayments] = useState(false);
    const [savingInvoices, setSavingInvoices] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchData = async () => {
        const res = await purchaseOrderApi.getClosureData(id);
        setPo(res);
    };

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                await fetchData();
            } catch (err) {
                setError("Failed to load PO closure data");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (id) load();
    }, [id]);

    const amountAfterTds = Number(po?.amountAfterTds || po?.grandTotal || 0);
    const totalPaymentDone = Number(po?.totalPaymentDone || 0);
    const totalPiAmount = Number(po?.totalPiAmount || 0);
    const remainingToPay = amountAfterTds - totalPaymentDone;
    const remainingInvoice = amountAfterTds - totalPiAmount;
    const canClose = remainingToPay <= 0 && remainingInvoice <= 0;

    const updatePaymentRow = (index: number, field: keyof PaymentRow, value: string) => {
        setPaymentRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    };

    const updateInvoiceRow = (index: number, field: keyof InvoiceRow, value: string | string[]) => {
        setInvoiceRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    };

    const savePayments = async () => {
        const valid = paymentRows.filter((r) => r.amount && r.accountNumber && r.ifsc);
        if (valid.length === 0) {
            setSaveMsg({ type: "error", text: "Fill amount, account no. and IFSC in at least one payment row." });
            return;
        }
        setSavingPayments(true);
        setSaveMsg(null);
        try {
            await purchaseOrderApi.bulkCreatePaymentRequests(id, valid);
            setPaymentRows([]);
            setSaveMsg({ type: "success", text: `${valid.length} payment request(s) created.` });
            await fetchData();
        } catch (err) {
            console.error(err);
            setSaveMsg({ type: "error", text: "Failed to save payment requests." });
        } finally {
            setSavingPayments(false);
        }
    };

    const saveInvoices = async () => {
        const valid = invoiceRows.filter((r) => r.category && r.partyName && r.valuePreGst);
        if (valid.length === 0) {
            setSaveMsg({ type: "error", text: "Fill category, party name and pre-GST in at least one invoice row." });
            return;
        }
        setSavingInvoices(true);
        setSaveMsg(null);
        try {
            await purchaseOrderApi.bulkCreatePurchaseInvoices(id, valid);
            setInvoiceRows([]);
            setSaveMsg({ type: "success", text: `${valid.length} purchase invoice(s) created.` });
            await fetchData();
        } catch (err) {
            console.error(err);
            setSaveMsg({ type: "error", text: "Failed to save purchase invoices." });
        } finally {
            setSavingInvoices(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !po) {
        return (
            <div className="flex justify-center py-12">
                <p className="text-destructive">{error || "PO not found"}</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">PO Closure — {po.poNumber}</h1>
                <Button variant="outline" onClick={() => navigate(paths.accounts.purchaseOrders)}>
                    Back to POs
                </Button>
            </CardHeader>

            <Card>
                <CardHeader>
                    <CardTitle>Reconciliation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                                <p className="text-sm font-medium">Payment Done (Paid Out)</p>
                                <p className="text-xs text-muted-foreground">Amount we have paid</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold">{formatINR(totalPaymentDone)}</p>
                                {totalPaymentDone >= amountAfterTds ? (
                                    <Badge variant="default" className="mt-1">Settled</Badge>
                                ) : (
                                    <Badge variant="outline" className="mt-1">Pending</Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                                <p className="text-sm font-medium">Invoice Received</p>
                                <p className="text-xs text-muted-foreground">Invoices received against payment</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold">{formatINR(totalPiAmount)}</p>
                                {totalPiAmount >= amountAfterTds ? (
                                    <Badge variant="default" className="mt-1">Settled</Badge>
                                ) : (
                                    <Badge variant="outline" className="mt-1">Pending</Badge>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                            {remainingToPay > 0 && (
                                <div className="flex items-center justify-between text-amber-600">
                                    <span className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Remaining to Pay
                                    </span>
                                    <span className="font-semibold">{formatINR(remainingToPay)}</span>
                                </div>
                            )}
                            {remainingInvoice > 0 && (
                                <div className="flex items-center justify-between text-amber-600">
                                    <span className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Remaining Invoice
                                    </span>
                                    <span className="font-semibold">{formatINR(remainingInvoice)}</span>
                                </div>
                            )}
                            {canClose && (
                                <div className="flex items-center justify-between text-green-600 pt-2">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5" />
                                        All settled — Ready to close
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {saveMsg && (
                <div className={`mx-6 mt-4 px-3 py-2 rounded-md text-sm ${saveMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {saveMsg.text}
                </div>
            )}

            {remainingToPay > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Record Payments</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setPaymentRows((rows) => [...rows, emptyPaymentRow()])}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Row
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {paymentRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No rows yet. Add a row to record a payment.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="text-xs uppercase">Payment Date</TableHead>
                                            <TableHead className="text-xs uppercase text-right">Amount</TableHead>
                                            <TableHead className="text-xs uppercase">Account Name</TableHead>
                                            <TableHead className="text-xs uppercase">Account No.</TableHead>
                                            <TableHead className="text-xs uppercase">IFSC</TableHead>
                                            <TableHead className="text-xs uppercase">UTR</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paymentRows.map((row, i) => (
                                            <TableRow key={i} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <Input
                                                        type="date"
                                                        className="h-8 w-36"
                                                        value={row.paymentDate}
                                                        onChange={(e) => updatePaymentRow(i, "paymentDate", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="h-8 w-32 text-right"
                                                        placeholder="0.00"
                                                        value={row.amount}
                                                        onChange={(e) => updatePaymentRow(i, "amount", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-8 w-40"
                                                        placeholder={po.sellerName || "Account name"}
                                                        value={row.accountName}
                                                        onChange={(e) => updatePaymentRow(i, "accountName", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-8 w-40"
                                                        placeholder="Account no."
                                                        value={row.accountNumber}
                                                        onChange={(e) => updatePaymentRow(i, "accountNumber", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-8 w-32 font-mono uppercase"
                                                        placeholder="IFSC"
                                                        value={row.ifsc}
                                                        onChange={(e) => updatePaymentRow(i, "ifsc", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-8 w-36 font-mono"
                                                        placeholder="UTR"
                                                        value={row.utr}
                                                        onChange={(e) => updatePaymentRow(i, "utr", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive"
                                                        onClick={() => setPaymentRows((rows) => rows.filter((_, idx) => idx !== i))}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="flex justify-end mt-4">
                            <Button onClick={savePayments} disabled={savingPayments || paymentRows.length === 0}>
                                {savingPayments ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Bulk Save Payments
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {remainingInvoice > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Record Invoices</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setInvoiceRows((rows) => [...rows, emptyInvoiceRow()])}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Row
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {invoiceRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No rows yet. Add a row to record an invoice.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="text-xs uppercase">Category</TableHead>
                                            <TableHead className="text-xs uppercase">Invoice Date</TableHead>
                                            <TableHead className="text-xs uppercase">Party Name</TableHead>
                                            <TableHead className="text-xs uppercase text-right">Pre GST</TableHead>
                                            <TableHead className="text-xs uppercase text-right">GST</TableHead>
                                            <TableHead className="text-xs uppercase">Upload File</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoiceRows.map((row, i) => (
                                            <TableRow key={i} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <Select value={row.category} onValueChange={(v) => updateInvoiceRow(i, "category", v)}>
                                                        <SelectTrigger size="sm" className="w-36">
                                                            <SelectValue placeholder="Category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {BUDGET_CATEGORIES.map((c) => (
                                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="date"
                                                        className="h-8 w-36"
                                                        value={row.invoiceDate}
                                                        onChange={(e) => updateInvoiceRow(i, "invoiceDate", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-8 w-44"
                                                        placeholder={po.sellerName || "Party name"}
                                                        value={row.partyName}
                                                        onChange={(e) => updateInvoiceRow(i, "partyName", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="h-8 w-32 text-right"
                                                        placeholder="0.00"
                                                        value={row.valuePreGst}
                                                        onChange={(e) => updateInvoiceRow(i, "valuePreGst", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="h-8 w-32 text-right"
                                                        placeholder="0.00"
                                                        value={row.gstAmount}
                                                        onChange={(e) => updateInvoiceRow(i, "gstAmount", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FileUploadCell
                                                        value={row.invoiceFile}
                                                        onChange={(paths) => updateInvoiceRow(i, "invoiceFile", paths)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive"
                                                        onClick={() => setInvoiceRows((rows) => rows.filter((_, idx) => idx !== i))}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="flex justify-end mt-4">
                            <Button onClick={saveInvoices} disabled={savingInvoices || invoiceRows.length === 0}>
                                {savingInvoices ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Bulk Save Invoices
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Payment Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {po.paymentRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No payment requests yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs uppercase">Request No</TableHead>
                                        <TableHead className="text-xs uppercase">Date</TableHead>
                                        <TableHead className="text-xs uppercase">Party</TableHead>
                                        <TableHead className="text-xs uppercase text-right">Amount</TableHead>
                                        <TableHead className="text-xs uppercase">Status</TableHead>
                                        <TableHead className="text-xs uppercase">Mode</TableHead>
                                        <TableHead className="text-xs uppercase">UTR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.paymentRequests.map((pr) => {
                                        const cfg = STATUS_CONFIG[pr.status] || { label: pr.status, variant: "outline" as const };
                                        return (
                                            <TableRow key={pr.id} className="hover:bg-muted/30">
                                                <TableCell className="text-sm font-mono">{pr.requestNo || "—"}</TableCell>
                                                <TableCell className="text-sm">{formatDate(pr.createdAt)}</TableCell>
                                                <TableCell className="text-sm">{pr.partyName || "—"}</TableCell>
                                                <TableCell className="text-sm text-right font-medium">{formatINR(Number(pr.amount || 0))}</TableCell>
                                                <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                                                <TableCell className="text-sm">{pr.paymentMode || "—"}</TableCell>
                                                <TableCell className="text-sm font-mono">{pr.utrNumber || "—"}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Purchase Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    {po.purchaseInvoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No purchase invoices yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs uppercase">Invoice No</TableHead>
                                        <TableHead className="text-xs uppercase">Date</TableHead>
                                        <TableHead className="text-xs uppercase">Category</TableHead>
                                        <TableHead className="text-xs uppercase">Party</TableHead>
                                        <TableHead className="text-xs uppercase text-right">Pre-GST</TableHead>
                                        <TableHead className="text-xs uppercase text-right">GST</TableHead>
                                        <TableHead className="text-xs uppercase text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.purchaseInvoices.map((inv) => {
                                        const piTotal = Number(inv.valuePreGst || 0) + Number(inv.gstAmount || 0);
                                        return (
                                            <TableRow key={inv.id} className="hover:bg-muted/30">
                                                <TableCell className="text-sm font-mono">{inv.invoiceNo || "—"}</TableCell>
                                                <TableCell className="text-sm">{formatDate(inv.invoiceDate)}</TableCell>
                                                <TableCell className="text-sm">{inv.category || "—"}</TableCell>
                                                <TableCell className="text-sm">{inv.partyName || "—"}</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(Number(inv.valuePreGst || 0))}</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(Number(inv.gstAmount || 0))}</TableCell>
                                                <TableCell className="text-sm text-right font-medium">{formatINR(piTotal)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CardFooter className="flex gap-3">
                {canClose && (
                    <Button className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Close PO
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default PoClosurePage;
