import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { PaymentRequestDetailDialog } from "@/modules/operations/payment-requests/components/PaymentRequestDetailDialog";
import { fileUploadService } from "@/services/api/file-upload.service";
import { AlertCircle, ArrowLeft, Calculator, ExternalLink, Eye, FileText } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OrderType, OrderViewData } from "./orderView.types";

function getFileLabel(path: string): string {
    return path.split("/").pop() || path;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    maker_done: { label: "Maker Done", variant: "secondary" },
    payment_done: { label: "Payment Done", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
};

function SectionHeader({ title }: Readonly<{ title: string }>) {
    return (
        <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="font-semibold text-sm">{title}</TableCell>
        </TableRow>
    );
}

function PdfVersionsInline({ versions, pdfUrl }: Readonly<{ versions: Record<string, { path: string; hash: string }> | null; pdfUrl: (label: string) => string }>) {
    if (!versions || Object.keys(versions).length === 0) return <span className="text-muted-foreground">—</span>;
    const labels = Object.keys(versions).sort((a, b) => b.localeCompare(a));
    return (
        <div className="flex flex-wrap gap-2">
            {labels.map(label => (
                <Button key={label} variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={pdfUrl(label)} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3 w-3" />
                        {label}
                    </a>
                </Button>
            ))}
        </div>
    );
}

function ApprovalBadge({ approved, tdsPercentage, tdsAmount, amountAfterTds, approvalRemark }: Readonly<{
    approved?: boolean;
    tdsPercentage?: number | string;
    tdsAmount?: number | string;
    amountAfterTds?: number | string;
    approvalRemark?: string;
}>) {
    if (approved === true) {
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
    if (approved === false) {
        return (
            <div className="flex items-center gap-2">
                <Badge variant="destructive">Rejected</Badge>
                {approvalRemark && <span className="text-xs text-muted-foreground">{approvalRemark}</span>}
            </div>
        );
    }
    return <Badge variant="outline">Pending</Badge>;
}

function AttachmentGroup({ title, paths }: Readonly<{ title: string; paths: string[] }>) {
    if (paths.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex flex-wrap gap-2">
                {paths.map(path => (
                    <Button key={path} variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                        <a href={fileUploadService.getFileUrl(path)} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3 w-3" />
                            {getFileLabel(path)}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
    );
}

interface OrderViewPageProps {
    type: OrderType;
    data?: OrderViewData;
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
    title: string;
    amountLabel: string;
    notFoundMessage: string;
    loadErrorMessage: string;
    pdfUrl: (id: number, label: string) => string;
}

export const OrderViewPage: React.FC<OrderViewPageProps> = ({
    data,
    isLoading,
    isError,
    error,
    title,
    amountLabel,
    notFoundMessage,
    loadErrorMessage,
    pdfUrl,
}) => {
    const navigate = useNavigate();
    const [viewingPrId, setViewingPrId] = useState<number | null>(null);

    const totalPaymentRequested = useMemo(() =>
        data?.paymentRequests?.filter(pr => pr.status !== 'rejected').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [data?.paymentRequests]
    );
    const totalMakerDone = useMemo(() =>
        data?.paymentRequests?.filter(pr => pr.status === 'maker_done').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [data?.paymentRequests]
    );
    const totalPaymentDone = useMemo(() =>
        data?.paymentRequests?.filter(pr => pr.status === 'payment_done').reduce((s, pr) => s + Number(pr.amount), 0) ?? 0,
        [data?.paymentRequests]
    );
    const totalPiAmount = useMemo(() =>
        data?.purchaseInvoices?.reduce((s, pi) => s + Number(pi.valuePreGst || 0) + Number(pi.gstAmount || 0), 0) ?? 0,
        [data?.purchaseInvoices]
    );
    const amountAfterTds = Number(data?.amountAfterTds || data?.total?.totalWithGst || 0);

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
                    <AlertDescription>{(error as Error | undefined)?.message || loadErrorMessage}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6">
                <Alert><AlertDescription>{notFoundMessage}</AlertDescription></Alert>
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
                        <h1 className="text-xl font-semibold">{data.number}</h1>
                        {data.category && <p className="text-sm text-muted-foreground">{data.category}</p>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {/* Details */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />{title}</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <SectionHeader title="Basic Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Date</TableCell>
                                    <TableCell className="text-sm w-1/4">{data.date ? formatDate(data.date) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Raised By</TableCell>
                                    <TableCell className="text-sm w-1/4">{data.raisedByName || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Approval Status</TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        <ApprovalBadge
                                            approved={data.approved}
                                            tdsPercentage={data.tdsPercentage}
                                            tdsAmount={data.tdsAmount}
                                            amountAfterTds={data.amountAfterTds}
                                            approvalRemark={data.approvalRemark}
                                        />
                                    </TableCell>
                                </TableRow>

                                <SectionHeader title="Vendor Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Name</TableCell>
                                    <TableCell className="text-sm">{data.sellerName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Email</TableCell>
                                    <TableCell className="text-sm">{data.sellerEmail || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Address</TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">{data.sellerAddress || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{data.sellerGstNo || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">PAN</TableCell>
                                    <TableCell className="text-sm">{data.sellerPanNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">MSME</TableCell>
                                    <TableCell className="text-sm">{data.sellerMsmeNo || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">CIN</TableCell>
                                    <TableCell className="text-sm">{data.sellerCinNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Contact Person</TableCell>
                                    <TableCell className="text-sm">{data.contactPersonName || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Contact Phone</TableCell>
                                    <TableCell className="text-sm">{data.contactPersonPhone || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Contact Email</TableCell>
                                    <TableCell className="text-sm">{data.contactPersonEmail || '—'}</TableCell>
                                </TableRow>

                                <SectionHeader title="Ship-to Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Name</TableCell>
                                    <TableCell className="text-sm">{data.shipToName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Address</TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">{data.shippingAddress || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{data.shipToGst || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">PAN</TableCell>
                                    <TableCell className="text-sm">{data.shipToPan || '—'}</TableCell>
                                </TableRow>

                                <SectionHeader title="Financial Information" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Pre-GST</TableCell>
                                    <TableCell className="text-sm">{formatINR(data.total?.total ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">GST</TableCell>
                                    <TableCell className="text-sm">{formatINR(data.total?.totalGst ?? 0)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Total</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(data.total?.totalWithGst ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">TDS %</TableCell>
                                    <TableCell className="text-sm">{data.tdsPercentage != null ? `${data.tdsPercentage}%` : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">TDS Amount</TableCell>
                                    <TableCell className="text-sm">{data.tdsAmount != null ? formatINR(Number(data.tdsAmount)) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount After TDS</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.amountAfterTds != null ? formatINR(Number(data.amountAfterTds)) : '—'}</TableCell>
                                </TableRow>

                                {data.attachments.length > 0 && (
                                    <>
                                        <SectionHeader title="Attachments" />
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm" colSpan={4}>
                                                <div className="space-y-3">
                                                    {data.attachments.map(group => (
                                                        <AttachmentGroup key={group.title} title={group.title} paths={group.paths} />
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </>
                                )}

                                <SectionHeader title="Documents" />
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">PDFs</TableCell>
                                    <TableCell className="text-sm" colSpan={3}><PdfVersionsInline versions={data.generatedPdfVersions} pdfUrl={(label) => pdfUrl(data.id, label)} /></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Products */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Products / Items</CardTitle></CardHeader>
                    <CardContent>
                        {data.products.length === 0 ? (
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
                                        {data.products.map((product, idx) => (
                                            <TableRow key={product.id} className="hover:bg-muted/30">
                                                <TableCell className="text-sm">{idx + 1}</TableCell>
                                                <TableCell className="text-sm">{product.description}</TableCell>
                                                <TableCell className="text-sm text-right">{product.qty} {product.unit}</TableCell>
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
                        {!data.paymentRequests || data.paymentRequests.length === 0 ? (
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
                                            <TableCell className="font-semibold text-xs uppercase">View</TableCell>
                                        </TableRow>
                                    </thead>
                                    <TableBody>
                                        {data.paymentRequests.map((pr) => {
                                            const cfg = STATUS_CONFIG[pr.status] || { label: pr.status, variant: "outline" as const };
                                            return (
                                                <TableRow key={pr.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-sm font-mono">{pr.requestNo}</TableCell>
                                                    <TableCell className="text-sm">{formatDate(pr.createdAt)}</TableCell>
                                                    <TableCell className="text-sm">{pr.partyName}</TableCell>
                                                    <TableCell className="text-sm text-right font-medium">{formatINR(Number(pr.amount))}</TableCell>
                                                    <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                                                    <TableCell className="text-sm">{pr.requestedByName}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewingPrId(pr.id)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
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

                {/* Purchase Invoices */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Purchase Invoices</CardTitle></CardHeader>
                    <CardContent>
                        {!data.purchaseInvoices || data.purchaseInvoices.length === 0 ? (
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
                                        {data.purchaseInvoices.map((pi) => {
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
                                                                <a href={fileUploadService.getFileUrl(pi.invoiceFile)} target="_blank" rel="noopener noreferrer">
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
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">{amountLabel}</TableCell>
                                    <TableCell className="text-sm font-semibold w-1/4">{formatINR(data.total?.totalWithGst ?? 0)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">TDS Amount</TableCell>
                                    <TableCell className="text-sm w-1/4">{data.tdsAmount != null ? formatINR(Number(data.tdsAmount)) : '—'}</TableCell>
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

            <PaymentRequestDetailDialog
                viewingId={viewingPrId}
                onClose={() => setViewingPrId(null)}
            />
        </Card>
    );
};
