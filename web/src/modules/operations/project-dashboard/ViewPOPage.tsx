import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ArrowLeft, ExternalLink, FileText, AlertCircle } from "lucide-react";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";
import { usePurchaseOrderDetails } from "@/hooks/api/useProjectDashboard";
import { projectDashboardApi } from "@/services/api/project-dashboard.api";
import type { PurchaseOrderView } from "./helpers/purchaseOrderView.types";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    maker_done: { label: "Maker Done", variant: "secondary" },
    payment_done: { label: "Payment Done", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
};

function Field({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm break-words">{value ?? "—"}</p>
        </div>
    );
}

function PdfVersionsInline({ versions, poId }: Readonly<{ versions: Record<string, { path: string; hash: string }> | null; poId: number; projectId: number }>) {
    if (!versions || Object.keys(versions).length === 0) return <span className="text-muted-foreground">—</span>;
    const labels = Object.keys(versions).sort((a, b) => b.localeCompare(a));
    return (
        <div className="flex flex-wrap gap-2">
            {labels.map(label => (
                <Button key={label} variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={projectDashboardApi.getPurchaseOrderPdfUrl(poId, label)} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3 w-3" />
                        {label}
                    </a>
                </Button>
            ))}
        </div>
    );
}

const ViewPOPage = () => {
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
            {/* Header */}
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
                    <CardHeader><CardTitle className="text-base">PO Details</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                            <Field label="Date" value={po.poDate ? formatDate(po.poDate) : null} />
                            <Field label="Pre-GST" value={formatINR(po.total?.total ?? 0)} />
                            <Field label="GST" value={formatINR(po.total?.totalGst ?? 0)} />
                            <Field label="Total" value={<span className="font-semibold">{formatINR(po.total?.totalWithGst ?? 0)}</span>} />
                            <Field label="Raised By" value={po.raisedByName} />
                            <Field label="TDS %" value={po.tdsPercentage != null ? `${po.tdsPercentage}%` : null} />
                            <Field label="TDS Amount" value={po.tdsAmount != null ? formatINR(Number(po.tdsAmount)) : null} />
                            <Field label="Amount After TDS" value={po.amountAfterTds != null ? <span className="font-semibold">{formatINR(Number(po.amountAfterTds))}</span> : null} />
                            <div className="col-span-2"><Field label="PDFs" value={<PdfVersionsInline versions={po.generatedPdfVersions} poId={po.id} projectId={projectId} />} /></div>
                        </div>
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
                    <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                            <Field label="Total PO Amount" value={<span className="font-semibold">{formatINR(po.total?.totalWithGst ?? 0)}</span>} />
                            <Field label="TDS Amount" value={po.tdsAmount != null ? formatINR(Number(po.tdsAmount)) : null} />
                            <Field label="Amount After TDS" value={<span className="font-semibold">{formatINR(amountAfterTds)}</span>} />
                            <Field label="Payment Requested" value={formatINR(totalPaymentRequested)} />
                            <Field label="Maker Done" value={formatINR(totalMakerDone)} />
                            <Field label="Payment Done" value={<span className="font-semibold text-green-600">{formatINR(totalPaymentDone)}</span>} />
                            <Field label="Remaining (To be Requested)" value={<span className="font-semibold">{formatINR(Math.max(0, amountAfterTds - totalPaymentRequested))}</span>} />
                            <Field label="PI Amount Received" value={formatINR(totalPiAmount)} />
                            <Field label="Remaining PI of Payment Done" value={<span className="font-semibold">{formatINR(Math.max(0, totalPiAmount - totalPaymentDone))}</span>} />
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
};

export default ViewPOPage;
