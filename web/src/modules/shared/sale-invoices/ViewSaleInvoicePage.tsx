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

const ViewSaleInvoicePage = () => {
    const { siId: siIdParam } = useParams<{ siId: string }>();
    const navigate = useNavigate();
    const siId = Number(siIdParam);

    const { data: si, isLoading, isError, error } = useSaleInvoice(siId);

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
    const items: Array<{
        srNo: number | null;
        itemDescription: string;
        quantity: string;
        rate: string;
        amount: string;
        gstRate: string;
        gstAmount: string;
        totalAmount: string;
    }> = si.items ?? [];

    const invoiceDocs: string[] = Array.isArray(si.invoiceDocPaths) ? si.invoiceDocPaths : [];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-semibold">{si.invoiceNumber || `SI #${si.id}`}</h1>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
            </div>

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
                        {invoiceDocs.length > 0 && (
                            <div className="col-span-2">
                                <Field
                                    label="Invoice Documents"
                                    value={invoiceDocs.map((path, idx) => (
                                        <Button key={idx} variant="outline" size="sm" className="h-7 text-xs gap-1 mr-2" asChild>
                                            <a href={path} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3 w-3" />
                                                Document {idx + 1}
                                            </a>
                                        </Button>
                                    ))}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

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
                                    {items.map((item, idx) => (
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

            {/* Summary */}
            <Card>
                <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <Field label="Total Pre-GST" value={formatINR(Number(si.totalPreGst || 0))} />
                        <Field label="Total GST" value={formatINR(Number(si.totalGst || 0))} />
                        <Field label="Grand Total" value={<span className="font-semibold">{formatINR(Number(si.grandTotal || 0))}</span>} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ViewSaleInvoicePage;
