import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { usePaymentRequestDetails } from "@/hooks/api/useProjectPaymentRequests";
import { tenderFilesService } from "@/services/api/tender-files.service";
import { projectDashboardApi } from "@/services/api/project-dashboard.api";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";

export const PAYMENT_AGAINST_LABELS: Record<string, string> = {
    upload_invoice: "Upload Invoice",
    new_pi: "New PI",
    po: "PO",
    others: "Imprest",
    imprest: "Imprest",
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
    maker_done: { label: "Maker Done", color: "text-blue-600 bg-blue-50" },
    payment_done: { label: "Payment Done", color: "text-green-600 bg-green-50" },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50" },
};

interface PaymentRequestDetailDialogProps {
    viewingId: number | null;
    onClose: () => void;
}

export const PaymentRequestDetailDialog: React.FC<PaymentRequestDetailDialogProps> = ({ viewingId, onClose }) => {
    const { data: detailData, isLoading: isDetailLoading } = usePaymentRequestDetails(viewingId ?? 0);
    const detail = detailData as PaymentRequestRow | undefined;

    let dialogContent: React.ReactNode;
    if (isDetailLoading) {
        dialogContent = (
            <div className="space-y-4 py-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
        );
    } else if (detail) {
        dialogContent = (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
                <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Request No</Label>
                    <p className="font-mono font-medium">{detail.requestNo}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Project</Label>
                    <p>{detail.projectName || "—"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Party Name</Label>
                    <p>{detail.partyName}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Amount</Label>
                    <p className="font-medium">{formatINR(detail.amount)}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Account Number</Label>
                    <p className="font-mono">{detail.accountNumber}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Bank Name</Label>
                    <p>{detail.bankName || "—"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">IFSC</Label>
                    <p className="font-mono">{detail.ifsc}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Payment Against</Label>
                    <p>{PAYMENT_AGAINST_LABELS[detail.paymentAgainst] || detail.paymentAgainst}</p>
                </div>
                {detail.purchaseOrderId && (
                    <div className="col-span-2 space-y-2">
                        <Label className="text-muted-foreground text-xs">PO Details</Label>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">PO Number:</span>
                                <span className="font-medium">{detail.poNumber || `#${detail.purchaseOrderId}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total (Pre-GST):</span>
                                <span>{formatINR(detail.poTotalAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">GST Amount:</span>
                                <span>{formatINR(detail.poTotalGstAmt || 0)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span>Grand Total:</span>
                                <span>{formatINR(detail.poGrandTotal || 0)}</span>
                            </div>
                            {detail.poTdsPercentage && Number(detail.poTdsPercentage) > 0 && (
                                <>
                                    <div className="border-t my-1.5" />
                                    <div className="flex justify-between text-destructive">
                                        <span>TDS @ {Number(detail.poTdsPercentage)}%:</span>
                                        <span>-{formatINR(detail.poTdsAmount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <span>Amount After TDS:</span>
                                        <span>{formatINR(detail.poAmountAfterTds || 0)}</span>
                                    </div>
                                </>
                            )}
                            <div className="border-t my-1.5" />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment Requested:</span>
                                <span>{formatINR(detail.poTotalPaymentRequested || 0)}</span>
                            </div>
                            <div className="flex justify-between pl-2 text-muted-foreground">
                                <span>Maker Done:</span>
                                <span>{formatINR(detail.poTotalMakerDone || 0)}</span>
                            </div>
                            <div className="flex justify-between pl-2 text-muted-foreground">
                                <span>Payment Done:</span>
                                <span>{formatINR(detail.poTotalPaymentDone || 0)}</span>
                            </div>
                            {(() => {
                                const cap = detail.poAmountAfterTds ? Number(detail.poAmountAfterTds) : Number(detail.poGrandTotal || 0);
                                const remaining = cap - Number(detail.poTotalPaymentRequested || 0);
                                return (
                                    <div className={`flex justify-between font-medium ${remaining < 0 ? "text-destructive" : ""}`}>
                                        <span>Remaining:</span>
                                        <span>{formatINR(remaining)}</span>
                                    </div>
                                );
                            })()}
                            <div className="pt-2">
                                <a
                                    href={projectDashboardApi.getPurchaseOrderPdfUrl(detail.purchaseOrderId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline text-xs"
                                >
                                    View Latest PO PDF
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                {detail.paymentAgainst === "new_pi" && (
                    <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs mb-1 block">Purchase Invoice Details</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Category:</span>
                                <p>{detail.piCategory || "—"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Party:</span>
                                <p>{detail.piPartyName}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Value (Pre GST):</span>
                                <p>{detail.piValuePreGst ?? "—"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">GST Amount:</span>
                                <p>{detail.piGstAmount ?? "—"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Invoice Date:</span>
                                <p>{detail.piInvoiceDate ? formatDate(detail.piInvoiceDate) : "—"}</p>
                            </div>
                            {detail.piInvoiceFile && (
                                <div>
                                    <span className="text-muted-foreground">Invoice File:</span>
                                    <a href={tenderFilesService.getFileUrl(detail.piInvoiceFile)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block">
                                        View
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <Badge variant="outline" className={STATUS_CONFIG[detail.status]?.color || ""}>
                        {STATUS_CONFIG[detail.status]?.label || detail.status}
                    </Badge>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Requested By</Label>
                    <p>{detail.requestedByName || "—"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Created At</Label>
                    <p>{formatDate(detail.createdAt)}</p>
                </div>
                {detail.utrNumber && (
                    <div>
                        <Label className="text-muted-foreground text-xs">UTR Number</Label>
                        <p className="font-mono">{detail.utrNumber}</p>
                    </div>
                )}
                {detail.rejectionReason && (
                    <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Rejection Reason</Label>
                        <p className="text-red-600">{detail.rejectionReason}</p>
                    </div>
                )}
                {detail.remark && (
                    <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Remark</Label>
                        <p>{detail.remark}</p>
                    </div>
                )}
                {(detail.poFile || detail.uploadedInvoiceFile) && (
                    <div className="col-span-2">
                        <Label className="text-muted-foreground text-xs">Uploaded Files</Label>
                        <div className="flex gap-2 mt-1">
                            {detail.poFile && (
                                <a href={tenderFilesService.getFileUrl(detail.poFile)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                                    PO File
                                </a>
                            )}
                            {detail.uploadedInvoiceFile && (
                                <a href={tenderFilesService.getFileUrl(detail.uploadedInvoiceFile)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                                    Invoice File
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    } else {
        dialogContent = (
            <p className="text-muted-foreground py-4 text-center">No details found.</p>
        );
    }

    return (
        <Dialog open={viewingId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payment Request Details</DialogTitle>
                    <DialogDescription>
                        Full details of the selected payment request
                    </DialogDescription>
                </DialogHeader>
                {dialogContent}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
