import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { AlertCircle, ArrowLeft, Banknote, Calculator, ExternalLink, FileText, History, IndianRupee, Lock, Package } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    oe_request: { label: "OE Request", variant: "outline" },
    invoiced: { label: "Invoiced", variant: "secondary" },
    credit_note: { label: "Credit Note", variant: "default" },
    payment_received: { label: "Payment Received", variant: "success" },
    completed: { label: "Completed", variant: "success" },
};

function DocLinks({ paths }: Readonly<{ paths: string[] }>) {
    if (!paths || paths.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex flex-wrap gap-2">
            {paths.map((path, idx) => (
                <Button key={idx} variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={path} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        Doc {idx + 1}
                    </a>
                </Button>
            ))}
        </div>
    );
}

function SectionHeader({ title }: Readonly<{ title: string }>) {
    return (
        <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="font-semibold text-sm">{title}</TableCell>
        </TableRow>
    );
}

const ViewSaleInvoicePage = () => {
    const { siId: siIdParam } = useParams<{ siId: string }>();
    const navigate = useNavigate();
    const siId = Number(siIdParam);

    const { data: si, isLoading, isError, error } = useSaleInvoice(siId);

    const values = useMemo(() => {
        if (!si) return { netReceived: 0, holdRemaining: 0, holdReleased: 0, cnTotal: 0, grandTotal: 0 };
        const grandTotal = Number(si.grandTotal || 0);
        const totalHoldAmount = Number(si.totalHoldAmount || 0);
        const holdReleasedAmount = Number(si.holdReleasedAmount || 0);
        const cnTotal = Number(si.cnTotal || 0);
        const netReceived = grandTotal
            - Number(si.gstTds || 0)
            - Number(si.itTds || 0)
            - Number(si.ldDeduction || 0)
            - Number(si.otherDeduction || 0)
            - totalHoldAmount;
        const holdRemaining = Math.max(0, totalHoldAmount - holdReleasedAmount);
        return { netReceived, holdRemaining, holdReleased: holdReleasedAmount, cnTotal, grandTotal };
    }, [si]);

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-8 w-64" />
                <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</CardContent></Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{(error as any)?.message || 'Failed to load Sale Invoice'}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!si) {
        return (
            <div className="p-6">
                <Alert><AlertDescription>Sale Invoice not found.</AlertDescription></Alert>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[si.status] || { label: si.status, variant: "outline" as const };
    const items: Array<any> = si.items ?? [];
    const invoiceDocs: string[] = Array.isArray(si.invoiceDocPaths) ? si.invoiceDocPaths : [];
    const creditNoteDocs: string[] = Array.isArray(si.creditNoteDocPaths) ? si.creditNoteDocPaths : [];
    const paymentAdviceDocs: string[] = Array.isArray(si.paymentAdviceDocPaths) ? si.paymentAdviceDocPaths : [];
    const buybackDocs: string[] = Array.isArray(si.buybackInvoiceDocPaths) ? si.buybackInvoiceDocPaths : [];
    const actionLogs: Array<any> = Array.isArray(si.actionLogs) ? si.actionLogs : [];

    return (
        <Card>
            <CardHeader className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex gap-4">
                    <h1 className="text-xl font-semibold">{si.invoiceNumber || `SI #${si.id}`}</h1>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* Invoice Details */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />Invoice Details</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Basic Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Date</TableCell>
                                    <TableCell className="text-sm w-1/4">{si.invoiceDate ? formatDate(si.invoiceDate) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Status</TableCell>
                                    <TableCell className="w-1/4"><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Billing Customer</TableCell>
                                    <TableCell className="text-sm">{si.billingCustomerName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Billing GST</TableCell>
                                    <TableCell className="text-sm">{si.billingGst || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Billing Address</TableCell>
                                    <TableCell className="text-sm" colSpan={3}>{si.billingAddress || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Shipping Customer</TableCell>
                                    <TableCell className="text-sm">{si.shippingCustomerName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Shipping GST</TableCell>
                                    <TableCell className="text-sm">{si.shippingGst || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Shipping Address</TableCell>
                                    <TableCell className="text-sm" colSpan={3}>{si.shippingAddress || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Raised By</TableCell>
                                    <TableCell className="text-sm" colSpan={3}>{si.raisedByName || si.raisedBy || '—'}</TableCell>
                                </TableRow>
                                {si.remarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Remarks</TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>{si.remarks}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                {/* Invoice-level GSTs (shown when invoiced+) */}
                {Number(si.invoiceTaxableAmount) > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><IndianRupee className="h-5 w-5" />Invoice Financials</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <SectionHeader title="Financials" />
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Taxable Amount</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.invoiceTaxableAmount || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">IGST</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.invoiceIgst || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">CGST</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.invoiceCgst || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">SGST</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.invoiceSgst || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Invoice Total</TableCell>
                                        <TableCell className="text-sm font-semibold" colSpan={3}>{formatINR(Number(si.invoiceTotal || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                        <TableCell className="text-sm" colSpan={3}><DocLinks paths={invoiceDocs} /></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                {/* Credit Note */}
                {Number(si.cnTaxable) > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />Credit Note</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <SectionHeader title="Credit Note" />
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">CN Taxable</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.cnTaxable || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">CN IGST</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.cnIgst || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">CN CGST</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.cnCgst || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">CN SGST</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.cnSgst || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">CN Total</TableCell>
                                        <TableCell className="text-sm font-semibold" colSpan={3}>{formatINR(Number(si.cnTotal || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                        <TableCell className="text-sm" colSpan={3}><DocLinks paths={creditNoteDocs} /></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                {/* Payment Received */}
                {si.status === "payment_received" || si.status === "completed" || Number(si.gstTds) > 0 ? (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Banknote className="h-5 w-5" />Payment Details</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <SectionHeader title="Payment Details" />
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">GST TDS</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.gstTds || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">IT TDS</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.itTds || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">LD Deduction</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.ldDeduction || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Other Deduction</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.otherDeduction || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Payment Advice Requested</TableCell>
                                        <TableCell className="text-sm">{si.paymentAdviceRequestedAt ? formatDate(si.paymentAdviceRequestedAt) : '—'}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Payment Advice Received</TableCell>
                                        <TableCell className="text-sm">{si.paymentAdviceReceivedAt ? formatDate(si.paymentAdviceReceivedAt) : '—'}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Payment Advice Docs</TableCell>
                                        <TableCell className="text-sm" colSpan={3}><DocLinks paths={paymentAdviceDocs} /></TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Buyback Docs</TableCell>
                                        <TableCell className="text-sm" colSpan={3}><DocLinks paths={buybackDocs} /></TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Net Received</TableCell>
                                        <TableCell className="text-sm font-semibold text-green-600" colSpan={3}>{formatINR(values.netReceived)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : null}
                {/* Hold Amounts */}
                {(Number(si.totalHoldAmount) > 0 || Number(si.holdGstIgst) > 0) && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5" />Hold Amounts</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <SectionHeader title="Hold Amounts" />
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">GST IGST</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.holdGstIgst || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">GST CGST</TableCell>
                                        <TableCell className="text-sm w-1/4">{formatINR(Number(si.holdGstCgst || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">GST SGST</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.holdGstSgst || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">ITC</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.holdItc || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Retention</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.holdRetention || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Buyback</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.holdBuyback || 0))}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Other Hold</TableCell>
                                        <TableCell className="text-sm">{formatINR(Number(si.holdOther || 0))}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Total Hold</TableCell>
                                        <TableCell className="text-sm font-semibold">{formatINR(Number(si.totalHoldAmount || 0))}</TableCell>
                                    </TableRow>
                                    {Number(si.holdReleasedAmount) > 0 && (
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">Released Amount</TableCell>
                                            <TableCell className="text-sm">{formatINR(Number(si.holdReleasedAmount || 0))}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">Released At</TableCell>
                                            <TableCell className="text-sm">{si.holdReleasedAt ? formatDate(si.holdReleasedAt) : '—'}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                {/* Items Table */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-5 w-5" />Invoice Items</CardTitle></CardHeader>
                    <CardContent>
                        {items.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No items.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="text-xs uppercase font-semibold">Sr No</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold">Description</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold text-right">Qty</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold text-right">Rate</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold text-right">Amount</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold text-right">GST%</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold text-right">GST Amt</TableHead>
                                            <TableHead className="text-xs uppercase font-semibold text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item: any, idx: number) => (
                                            <TableRow key={idx} className="hover:bg-muted/30">
                                                <TableCell className="text-sm">{item.srNo ?? idx + 1}</TableCell>
                                                <TableCell className="text-sm">{item.itemDescription}</TableCell>
                                                <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(Number(item.rate || 0))}</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(Number(item.amount || 0))}</TableCell>
                                                <TableCell className="text-sm text-right">{item.gstRate}%</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(Number(item.gstAmount || 0))}</TableCell>
                                                <TableCell className="text-sm text-right font-medium">{formatINR(Number(item.totalAmount || 0))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {/* Summary — Totals */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-5 w-5" />Summary</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Reconciliation" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Total Pre-GST</TableCell>
                                    <TableCell className="text-sm w-1/4">{formatINR(Number(si.totalPreGst || 0))}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Total GST</TableCell>
                                    <TableCell className="text-sm w-1/4">{formatINR(Number(si.totalGst || 0))}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Payment Received (Net)</TableCell>
                                    <TableCell className="text-sm font-semibold text-green-600">{formatINR(values.netReceived)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount Hold (Remaining)</TableCell>
                                    <TableCell className="text-sm">{formatINR(values.holdRemaining)}</TableCell>
                                </TableRow>
                                {values.cnTotal > 0 ? (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Amount Released</TableCell>
                                        <TableCell className="text-sm">{formatINR(values.holdReleased)}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Less: Credit Note</TableCell>
                                        <TableCell className="text-sm text-destructive">- {formatINR(values.cnTotal)}</TableCell>
                                    </TableRow>
                                ) : (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Amount Released</TableCell>
                                        <TableCell className="text-sm" colSpan={3}>{formatINR(values.holdReleased)}</TableCell>
                                    </TableRow>
                                )}
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Grand Total</TableCell>
                                    <TableCell className="text-sm font-semibold" colSpan={3}>{formatINR(values.grandTotal)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                {/* Action Log */}
                {actionLogs.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-5 w-5" />Activity Log</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {actionLogs.map((entry: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm py-1 border-b border-border/40 last:border-0">
                                        <Badge variant="outline" className="shrink-0 text-xs">{entry.action?.replace(/_/g, " ")}</Badge>
                                        <span className="text-muted-foreground text-xs">
                                            {entry.updatedAt ? formatDate(entry.updatedAt) : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
};

export default ViewSaleInvoicePage;
