import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { usePurchaseOrderDetails } from "@/hooks/api/usePurchaseOrders";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { AlertCircle, ArrowLeft, Calculator, ExternalLink, FileText } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PurchaseOrderView } from "../helpers/purchaseOrderView.types";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    maker_done: { label: "Maker Done", variant: "secondary" },
    payment_done: { label: "Payment Done", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
};

function PdfVersionsInline({ versions, poId }: Readonly<{ versions: Record<string, { path: string; hash: string }> | null; poId: number; projectId: number }>) {
    if (!versions || Object.keys(versions).length === 0) return <span className="text-muted-foreground">—</span>;
    const labels = Object.keys(versions).sort((a, b) => b.localeCompare(a));
    return (
        <div className="flex flex-wrap gap-2">
            {labels.map(label => (
                <Button key={label} variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={purchaseOrderApi.getPurchaseOrderPdfUrl(poId, label)} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3 w-3" />
                        {label}
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

const ViewPurchaseOrderPage = () => {
    const { projectId: projectIdParam, poId: poIdParam } = useParams<{ projectId: string; poId: string }>();
    const navigate = useNavigate();
    const projectId = Number(projectIdParam);
    const poId = Number(poIdParam);

    const { data, isLoading, isError, error } = usePurchaseOrderDetails(poId);
    const po = data as PurchaseOrderView | undefined;

    const totalPaymentRequested = useMemo(() =>
        po?.paymentRequests?.filter(pr => pr.status !== 'rejected').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [po?.paymentRequests]
    );
    const totalMakerDone = useMemo(() =>
        po?.paymentRequests?.filter(pr => pr.status === 'maker_done').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [po?.paymentRequests]
    );
    const totalPaymentDone = useMemo(() =>
        po?.paymentRequests?.filter(pr => pr.status === 'payment_done').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [po?.paymentRequests]
    );
    const totalPiAmount = useMemo(() =>
        po?.purchaseInvoices?.reduce((s, pi) => s + Number(pi.valuePreGst || 0) + Number(pi.gstAmount || 0), 0) ?? 0,
        [po?.purchaseInvoices]
    );
    const amountAfterTds = Number(po?.amountAfterTds || po?.total?.totalWithGst || 0);

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
                    <AlertDescription>{(error as any)?.message || 'Failed to load Purchase Order'}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!po) {
        return (
            <div className="p-6">
                <Alert><AlertDescription>Purchase Order not found.</AlertDescription></Alert>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{po.poNumber || `PO #${po.id}`}</h1>
                        {po.category && <p className="text-sm text-muted-foreground">{po.category}</p>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {/* PO Details */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />PO Details</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Basic Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Date</TableCell>
                                    <TableCell className="text-sm w-1/4">{po.poDate ? formatDate(po.poDate) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Raised By</TableCell>
                                    <TableCell className="text-sm w-1/4">{po.raisedByName || '—'}</TableCell>
                                </TableRow>
                                <SectionHeader title="Financial Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Pre-GST</TableCell>
                                    <TableCell className="text-sm">{formatINR(po.total?.total ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{formatINR(po.total?.totalGst ?? 0)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Total</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(po.total?.totalWithGst ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">TDS %</TableCell>
                                    <TableCell className="text-sm">{po.tdsPercentage != null ? `${po.tdsPercentage}%` : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">TDS Amount</TableCell>
                                    <TableCell className="text-sm">{po.tdsAmount != null ? formatINR(Number(po.tdsAmount)) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount After TDS</TableCell>
                                    <TableCell className="text-sm font-semibold">{po.amountAfterTds != null ? formatINR(Number(po.amountAfterTds)) : '—'}</TableCell>
                                </TableRow>
                                <SectionHeader title="Documents" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">PDFs</TableCell>
                                    <TableCell className="text-sm" colSpan={3}><PdfVersionsInline versions={po.generatedPdfVersions} poId={po.id} projectId={projectId} /></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Payment Requests */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Payment Requests</CardTitle></CardHeader>
                    <CardContent>
                        {po.paymentRequests.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No payment requests yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <thead>
                                        <TableRow className="bg-muted/50">
                                            <TableCell className="font-semibold text-xs uppercase">PR No</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Date</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Beneficiary</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Amount</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Status</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Raised By</TableCell>
                                        </TableRow>
                                    </thead>
                                    <TableBody>
                                        {po.paymentRequests.map((pr) => {
                                            const cfg = STATUS_CONFIG[pr.status] || { label: pr.status, variant: "outline" as const };
                                            return (
                                                <TableRow key={pr.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-sm font-mono">{pr.requestNo}</TableCell>
                                                    <TableCell className="text-sm">{formatDate(pr.createdAt)}</TableCell>
                                                    <TableCell className="text-sm">{pr.partyName}</TableCell>
                                                    <TableCell className="text-sm text-right font-medium">{formatINR(Number(pr.amount))}</TableCell>
                                                    <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                                                    <TableCell className="text-sm">{pr.requestedByName}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Purchase Invoices */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Purchase Invoices</CardTitle></CardHeader>
                    <CardContent>
                        {po.purchaseInvoices.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No purchase invoices yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <thead>
                                        <TableRow className="bg-muted/50">
                                            <TableCell className="font-semibold text-xs uppercase">PI No</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Date</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Pre-GST</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">GST</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Total</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Uploaded By</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">File</TableCell>
                                        </TableRow>
                                    </thead>
                                    <TableBody>
                                        {po.purchaseInvoices.map((pi) => {
                                            const piTotal = Number(pi.valuePreGst || 0) + Number(pi.gstAmount || 0);
                                            return (
                                                <TableRow key={pi.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-sm font-mono">{pi.invoiceNo}</TableCell>
                                                    <TableCell className="text-sm">{formatDate(pi.invoiceDate)}</TableCell>
                                                    <TableCell className="text-sm text-right">{formatINR(Number(pi.valuePreGst || 0))}</TableCell>
                                                    <TableCell className="text-sm text-right">{formatINR(Number(pi.gstAmount || 0))}</TableCell>
                                                    <TableCell className="text-sm text-right font-medium">{formatINR(piTotal)}</TableCell>
                                                    <TableCell className="text-sm">{pi.uploadedByName}</TableCell>
                                                    <TableCell>
                                                        {pi.invoiceFile ? (
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                                                                <a href={pi.invoiceFile} target="_blank" rel="noopener noreferrer">
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        ) : "—"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-5 w-5" />Summary</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Summary" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Total PO Amount</TableCell>
                                    <TableCell className="text-sm font-semibold w-1/4">{formatINR(po.total?.totalWithGst ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">TDS Amount</TableCell>
                                    <TableCell className="text-sm w-1/4">{po.tdsAmount != null ? formatINR(Number(po.tdsAmount)) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount After TDS</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(amountAfterTds)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Payment Requested</TableCell>
                                    <TableCell className="text-sm">{formatINR(totalPaymentRequested)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Maker Done</TableCell>
                                    <TableCell className="text-sm">{formatINR(totalMakerDone)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Payment Done</TableCell>
                                    <TableCell className="text-sm font-semibold text-green-600">{formatINR(totalPaymentDone)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Remaining (To be Requested)</TableCell>
                                    <TableCell className="text-sm font-semibold" colSpan={3}>{formatINR(Math.max(0, amountAfterTds - totalPaymentRequested))}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">PI Amount Received</TableCell>
                                    <TableCell className="text-sm">{formatINR(totalPiAmount)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Remaining PI of Payment Done</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(Math.max(0, totalPiAmount - totalPaymentDone))}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
};

export default ViewPurchaseOrderPage;
