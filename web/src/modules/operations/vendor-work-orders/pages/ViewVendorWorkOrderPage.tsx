import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useVendorWorkOrderDetails } from "@/hooks/api/useVendorWorkOrders";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import { AlertCircle, ArrowLeft, Calculator, FileText } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { VendorWorkOrderView } from "../helpers/vwoView.types";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    maker_done: { label: "Maker Done", variant: "secondary" },
    payment_done: { label: "Payment Done", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
};

function PdfVersionsInline({ versions, vwoId }: Readonly<{ versions: Record<string, { path: string; hash: string }> | null; vwoId: number }>) {
    if (!versions || Object.keys(versions).length === 0) return <span className="text-muted-foreground">—</span>;
    const labels = Object.keys(versions).sort((a, b) => b.localeCompare(a));
    return (
        <div className="flex flex-wrap gap-2">
            {labels.map(label => (
                <Button key={label} variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={vendorWorkOrderApi.getPdfDownloadUrl(vwoId, label)} target="_blank" rel="noopener noreferrer">
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

function ApprovalBadge({ woApproved, tdsPercentage, tdsAmount, amountAfterTds, woApprovalRemark }: Readonly<{
    woApproved?: boolean;
    tdsPercentage?: number | string;
    tdsAmount?: number | string;
    amountAfterTds?: number | string;
    woApprovalRemark?: string;
}>) {
    if (woApproved === true) {
        return (
            <div className="flex items-center gap-2">
                <Badge variant="default">Approved</Badge>
                {tdsPercentage != null && (
                    <span className="text-xs text-muted-foreground">
                        TDS {tdsPercentage}% (-{formatINR(Number(tdsAmount || 0))}) · After TDS: {formatINR(Number(amountAfterTds || 0))}
                    </span>
                )}
            </div>
        );
    }
    if (woApproved === false) {
        return (
            <div className="flex items-center gap-2">
                <Badge variant="destructive">Rejected</Badge>
                {woApprovalRemark && <span className="text-xs text-muted-foreground">{woApprovalRemark}</span>}
            </div>
        );
    }
    return <Badge variant="outline">Pending</Badge>;
}

const ViewVendorWorkOrderPage = () => {
    const { projectId: projectIdParam, woId: woIdParam } = useParams<{ projectId: string; woId: string }>();
    const navigate = useNavigate();
    const woId = Number(woIdParam);

    const { data, isLoading, isError, error } = useVendorWorkOrderDetails(woId);
    const vwo = data as VendorWorkOrderView | undefined;

    const totalPaymentRequested = useMemo(() =>
        vwo?.paymentRequests?.filter(pr => pr.status !== 'rejected').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [vwo?.paymentRequests]
    );
    const totalMakerDone = useMemo(() =>
        vwo?.paymentRequests?.filter(pr => pr.status === 'maker_done').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [vwo?.paymentRequests]
    );
    const totalPaymentDone = useMemo(() =>
        vwo?.paymentRequests?.filter(pr => pr.status === 'payment_done').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [vwo?.paymentRequests]
    );
    const amountAfterTds = Number(vwo?.amountAfterTds || vwo?.total?.totalWithGst || 0);

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
                    <AlertDescription>{(error as any)?.message || 'Failed to load Vendor Work Order'}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!vwo) {
        return (
            <div className="p-6">
                <Alert><AlertDescription>Vendor Work Order not found.</AlertDescription></Alert>
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
                        <h1 className="text-xl font-semibold">{vwo.woNumber || `VWO #${vwo.id}`}</h1>
                        {vwo.category && <p className="text-sm text-muted-foreground">{vwo.category}</p>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {/* VWO Details */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />VWO Details</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Basic Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Date</TableCell>
                                    <TableCell className="text-sm w-1/4">{vwo.woDate ? formatDate(vwo.woDate) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Raised By</TableCell>
                                    <TableCell className="text-sm w-1/4">{vwo.raisedByName || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Approval Status</TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        <ApprovalBadge
                                            woApproved={vwo.woApproved}
                                            tdsPercentage={vwo.tdsPercentage}
                                            tdsAmount={vwo.tdsAmount}
                                            amountAfterTds={vwo.amountAfterTds}
                                            woApprovalRemark={vwo.woApprovalRemark}
                                        />
                                    </TableCell>
                                </TableRow>

                                <SectionHeader title="Vendor Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Name</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Email</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerEmail || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Address</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerAddress || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerGstNo || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">PAN</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerPanNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">MSME</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerMsmeNo || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">CIN</TableCell>
                                    <TableCell className="text-sm">{vwo.sellerCinNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Contact Person</TableCell>
                                    <TableCell className="text-sm">{vwo.contactPersonName || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Contact Phone</TableCell>
                                    <TableCell className="text-sm">{vwo.contactPersonPhone || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Contact Email</TableCell>
                                    <TableCell className="text-sm">{vwo.contactPersonEmail || '—'}</TableCell>
                                </TableRow>

                                <SectionHeader title="Ship-to Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Name</TableCell>
                                    <TableCell className="text-sm">{vwo.shipToName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Address</TableCell>
                                    <TableCell className="text-sm">{vwo.shippingAddress || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{vwo.shipToGst || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">PAN</TableCell>
                                    <TableCell className="text-sm">{vwo.shipToPan || '—'}</TableCell>
                                </TableRow>

                                <SectionHeader title="Scope of Work" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm" colSpan={4}>{vwo.scopeOfWork || '—'}</TableCell>
                                </TableRow>

                                <SectionHeader title="Financial Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Pre-GST</TableCell>
                                    <TableCell className="text-sm">{formatINR(vwo.total?.total ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{formatINR(vwo.total?.totalGst ?? 0)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Total</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(vwo.total?.totalWithGst ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">TDS %</TableCell>
                                    <TableCell className="text-sm">{vwo.tdsPercentage != null ? `${vwo.tdsPercentage}%` : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">TDS Amount</TableCell>
                                    <TableCell className="text-sm">{vwo.tdsAmount != null ? formatINR(Number(vwo.tdsAmount)) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount After TDS</TableCell>
                                    <TableCell className="text-sm font-semibold">{vwo.amountAfterTds != null ? formatINR(Number(vwo.amountAfterTds)) : '—'}</TableCell>
                                </TableRow>

                                <SectionHeader title="Documents" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">PDFs</TableCell>
                                    <TableCell className="text-sm" colSpan={3}><PdfVersionsInline versions={vwo.generatedPdfVersions} vwoId={vwo.id} /></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Products */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Products / Items</CardTitle></CardHeader>
                    <CardContent>
                        {vwo.products.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No items.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <thead>
                                        <TableRow className="bg-muted/50">
                                            <TableCell className="font-semibold text-xs uppercase">#</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase">Description</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Qty</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Rate</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Pre-GST</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">GST%</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">GST Amt</TableCell>
                                            <TableCell className="font-semibold text-xs uppercase text-right">Total</TableCell>
                                        </TableRow>
                                    </thead>
                                    <TableBody>
                                        {vwo.products.map((product, idx) => (
                                            <TableRow key={product.id} className="hover:bg-muted/30">
                                                <TableCell className="text-sm">{idx + 1}</TableCell>
                                                <TableCell className="text-sm">{product.description}</TableCell>
                                                <TableCell className="text-sm text-right">{product.qty}</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(product.rate)}</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(product.taxableAmount)}</TableCell>
                                                <TableCell className="text-sm text-right">{product.gstRate}%</TableCell>
                                                <TableCell className="text-sm text-right">{formatINR(product.gstAmount)}</TableCell>
                                                <TableCell className="text-sm text-right font-medium">{formatINR(product.totalAmount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Requests */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Payment Requests</CardTitle></CardHeader>
                    <CardContent>
                        {!vwo.paymentRequests || vwo.paymentRequests.length === 0 ? (
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
                                        {vwo.paymentRequests.map((pr) => {
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

                {/* Summary */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-5 w-5" />Summary</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Summary" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Total VWO Amount</TableCell>
                                    <TableCell className="text-sm font-semibold w-1/4">{formatINR(vwo.total?.totalWithGst ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">TDS Amount</TableCell>
                                    <TableCell className="text-sm w-1/4">{vwo.tdsAmount != null ? formatINR(Number(vwo.tdsAmount)) : '—'}</TableCell>
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
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
};

export default ViewVendorWorkOrderPage;