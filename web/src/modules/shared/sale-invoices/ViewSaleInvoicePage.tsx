import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    oe_request: { label: "OE Request", variant: "outline" },
    invoiced: { label: "Invoiced", variant: "secondary" },
    credit_note: { label: "Credit Note", variant: "default" },
    payment_received: { label: "Payment Received", variant: "success" },
    completed: { label: "Completed", variant: "success" },
};

function Field({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm break-words">{value ?? "—"}</p>
        </div>
    );
}

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
            {/* Header */}
            <CardHeader className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex gap-4">
                    <h1 className="text-xl font-semibold">{si.invoiceNumber || `SI #${si.id}`}</h1>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Invoice Details */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                            <Field label="Date" value={si.invoiceDate ? formatDate(si.invoiceDate) : null} />
                            <Field label="Billing Customer" value={si.billingCustomerName} />
                            <Field label="Billing Address" value={si.billingAddress} />
                            <Field label="Billing GST" value={si.billingGst} />
                            <Field label="Shipping Customer" value={si.shippingCustomerName} />
                            <Field label="Shipping Address" value={si.shippingAddress} />
                            <Field label="Shipping GST" value={si.shippingGst} />
                            <Field label="Total Pre-GST" value={formatINR(Number(si.totalPreGst || 0))} />
                            <Field label="Total GST" value={formatINR(Number(si.totalGst || 0))} />
                            <Field label="Grand Total" value={<span className="font-semibold">{formatINR(Number(si.grandTotal || 0))}</span>} />
                            <Field label="Status" value={<Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>} />
                            <Field label="Raised By" value={si.raisedByName || si.raisedBy} />
                            <Field label="Remarks" value={si.remarks} />
                        </div>
                    </CardContent>
                </Card>
                {/* Invoice-level GSTs (shown when invoiced+) */}
                {Number(si.invoiceTaxableAmount) > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Invoice Financials</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                <Field label="Taxable Amount" value={formatINR(Number(si.invoiceTaxableAmount || 0))} />
                                <Field label="IGST" value={formatINR(Number(si.invoiceIgst || 0))} />
                                <Field label="CGST" value={formatINR(Number(si.invoiceCgst || 0))} />
                                <Field label="SGST" value={formatINR(Number(si.invoiceSgst || 0))} />
                                <Field label="Invoice Total" value={<span className="font-semibold">{formatINR(Number(si.invoiceTotal || 0))}</span>} />
                                <Field label="Documents" value={<DocLinks paths={invoiceDocs} />} />
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Credit Note */}
                {Number(si.cnTaxable) > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Credit Note</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                <Field label="CN Taxable" value={formatINR(Number(si.cnTaxable || 0))} />
                                <Field label="CN IGST" value={formatINR(Number(si.cnIgst || 0))} />
                                <Field label="CN CGST" value={formatINR(Number(si.cnCgst || 0))} />
                                <Field label="CN SGST" value={formatINR(Number(si.cnSgst || 0))} />
                                <Field label="CN Total" value={<span className="font-semibold">{formatINR(Number(si.cnTotal || 0))}</span>} />
                                <Field label="Documents" value={<DocLinks paths={creditNoteDocs} />} />
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Payment Received */}
                {si.status === "payment_received" || si.status === "completed" || Number(si.gstTds) > 0 ? (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                <Field label="Payment Advice Docs" value={<DocLinks paths={paymentAdviceDocs} />} />
                                <Field label="Buyback Docs" value={<DocLinks paths={buybackDocs} />} />
                                <Field label="GST TDS" value={formatINR(Number(si.gstTds || 0))} />
                                <Field label="IT TDS" value={formatINR(Number(si.itTds || 0))} />
                                <Field label="LD Deduction" value={formatINR(Number(si.ldDeduction || 0))} />
                                <Field label="Other Deduction" value={formatINR(Number(si.otherDeduction || 0))} />
                                <Field label="Payment Advice Requested" value={si.paymentAdviceRequestedAt ? formatDate(si.paymentAdviceRequestedAt) : null} />
                                <Field label="Payment Advice Received" value={si.paymentAdviceReceivedAt ? formatDate(si.paymentAdviceReceivedAt) : null} />
                                <Field label="Net Received" value={<span className="font-semibold text-green-600">{formatINR(values.netReceived)}</span>} />
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
                {/* Hold Amounts */}
                {(Number(si.totalHoldAmount) > 0 || Number(si.holdGstIgst) > 0) && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Hold Amounts</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                <Field label="GST IGST" value={formatINR(Number(si.holdGstIgst || 0))} />
                                <Field label="GST CGST" value={formatINR(Number(si.holdGstCgst || 0))} />
                                <Field label="GST SGST" value={formatINR(Number(si.holdGstSgst || 0))} />
                                <Field label="ITC" value={formatINR(Number(si.holdItc || 0))} />
                                <Field label="Retention" value={formatINR(Number(si.holdRetention || 0))} />
                                <Field label="Buyback" value={formatINR(Number(si.holdBuyback || 0))} />
                                <Field label="Other Hold" value={formatINR(Number(si.holdOther || 0))} />
                                <Field label="Total Hold" value={<span className="font-semibold">{formatINR(Number(si.totalHoldAmount || 0))}</span>} />
                                {Number(si.holdReleasedAmount) > 0 && (
                                    <>
                                        <Field label="Released Amount" value={formatINR(Number(si.holdReleasedAmount || 0))} />
                                        <Field label="Released At" value={si.holdReleasedAt ? formatDate(si.holdReleasedAt) : null} />
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Items Table */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Invoice Items</CardTitle></CardHeader>
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
                {/* Summary — Reconciliation */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                            <Field label="Total Pre-GST" value={formatINR(Number(si.totalPreGst || 0))} />
                            <Field label="Total GST" value={formatINR(Number(si.totalGst || 0))} />
                            <Field label="Payment Received (Net)" value={<span className="font-semibold text-green-600">{formatINR(values.netReceived)}</span>} />
                            <Field label="Amount Hold (Remaining)" value={formatINR(values.holdRemaining)} />
                            <Field label="Amount Released" value={formatINR(values.holdReleased)} />
                            {values.cnTotal > 0 && (
                                <Field label="Less: Credit Note" value={<span className="text-destructive">- {formatINR(values.cnTotal)}</span>} />
                            )}
                            <Field
                                label="Grand Total"
                                value={<span className="font-semibold text-lg">{formatINR(values.grandTotal)}</span>}
                            />
                        </div>
                    </CardContent>
                </Card>
                {/* Action Log */}
                {actionLogs.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
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
