import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentRequestDetails } from "@/hooks/api/useProjectPaymentRequests";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import { formatINR } from "@/hooks/useINRFormatter";
import { fileUploadService } from "@/services/api/file-upload.service";
import { PAYMENT_AGAINST_LABELS, STATUS_CONFIG } from "../constants";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";

interface PaymentRequestViewModalProps {
    viewingId: number | null;
    onClose: () => void;
}

export const PaymentRequestViewModal: React.FC<PaymentRequestViewModalProps> = ({
    viewingId,
    onClose,
}) => {
    const { data: detailData, isLoading: isDetailLoading } = usePaymentRequestDetails(
        viewingId ?? 0
    );
    const detail = detailData as PaymentRequestRow | undefined;

    let tdsInfo: React.ReactNode | null = null;
    if (detail?.tdsPercentage) {
        const tdsPct = Number(detail.tdsPercentage);
        const amount = detail.amount ?? 0;
        const tdsAmount = Math.round((amount * tdsPct) / 100 * 100) / 100;
        const netPayable = Math.round((amount - tdsAmount) * 100) / 100;
        tdsInfo = (
            <div>
                <Label className="text-muted-foreground text-xs">Net Payable</Label>
                <p className="font-medium text-green-500">{formatINR(netPayable)}</p>
                <Label className="text-muted-foreground text-xs font-mono">
                    TDS @ {tdsPct}% (-{formatINR(tdsAmount)}) = {formatINR(netPayable)}
                </Label>
            </div>
        );
    }

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
                    <p className="font-medium text-muted dark:text-muted-foreground">
                        {formatINR(detail.amount || 0)}
                    </p>
                </div>
                {tdsInfo}
                <div>
                    <Label className="text-muted-foreground text-xs">Payment Against</Label>
                    <p>
                        {detail.paymentAgainst && PAYMENT_AGAINST_LABELS[detail.paymentAgainst]}
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Payment Mode</Label>
                    <p className="capitalize">
                        {detail.paymentMode?.replaceAll("_", " ").toLowerCase() || "—"}
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Account Number</Label>
                    <p className="font-mono">
                        {detail.accountNumber || "—"}
                    </p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">IFSC</Label>
                    <p className="font-mono">
                        {detail.ifsc || "—"}
                    </p>
                </div>
                {detail.portalLink && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Portal Link</Label>
                        <p className="text-blue-600 underline break-all">{detail.portalLink}</p>
                    </div>
                )}
                <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <Badge
                        variant="outline"
                        className={STATUS_CONFIG[detail.status]?.color || ""}
                    >
                        {STATUS_CONFIG[detail.status]?.label || detail.status}
                    </Badge>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Requested By</Label>
                    <p>{detail.requestedByName || "—"}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">Created At</Label>
                    <p>{detail.createdAt ? (formatDateTime(detail.createdAt)) : "—"}</p>
                </div>
                {detail.utrNumber && (
                    <div>
                        <Label className="text-muted-foreground text-xs">UTR Number</Label>
                        <p className="font-mono">{detail.utrNumber}</p>
                    </div>
                )}
                {detail.rejectionReason && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Rejection Reason</Label>
                        <p className="text-red-600">{detail.rejectionReason}</p>
                    </div>
                )}
                {detail.remark && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Remark</Label>
                        <p>{detail.remark}</p>
                    </div>
                )}
                {detail.billFiles && detail.billFiles.length > 0 && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Bill / Proof Files</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {detail.billFiles.map((f, i) => (
                                <a
                                    key={i}
                                    href={fileUploadService.getFileUrl(f)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 underline"
                                >
                                    File {i + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                {detail.uploadInvoice?.length > 0 && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Upload Invoice</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {detail.uploadInvoice.map((f, i) => (
                                <a
                                    key={i}
                                    href={fileUploadService.getFileUrl(f)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 underline"
                                >
                                    File {i + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                {detail.uploadPI?.length > 0 && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Upload PI</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {detail.uploadPI.map((f, i) => (
                                <a
                                    key={i}
                                    href={fileUploadService.getFileUrl(f)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 underline"
                                >
                                    File {i + 1}
                                </a>
                            ))
                        }
                        </div>
                    </div>
                )}
                {detail.uploadInvoiceAfterPayment?.length > 0 && (
                    <div>
                        <Label className="text-muted-foreground text-xs">Upload Invoice after Payment</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {detail.uploadInvoiceAfterPayment.map((f, i) => (
                                <a
                                    key={i}
                                    href={fileUploadService.getFileUrl(f)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 underline"
                                >
                                    File {i + 1}
                                </a>
                            ))
                        }
                        </div>
                    </div>
                )}
                {detail.purchaseOrderId && (
                    <div className="col-span-2 space-y-2">
                        <Label className="text-muted-foreground text-xs">PO Details</Label>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">PO Number:</span>
                                <span className="font-medium">{detail.poNumber || `#${detail.purchaseOrderId}`}</span>
                            </div>
                            {detail.poFile && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">PO File:</span>
                                    <a href={fileUploadService.getFileUrl(detail.poFile)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Download PO</a>
                                </div>
                            )}
                            <div className="flex justify-between"><span className="text-muted-foreground">Grand Total:</span><span>{formatINR(detail.poGrandTotal || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">TDS %:</span><span>{detail.poTdsPercentage || "0"}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">TDS Amount:</span><span>{formatINR(detail.poTdsAmount || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Amount After TDS:</span><span>{formatINR(detail.poAmountAfterTds || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Payment Requested:</span><span>{formatINR(detail.poTotalPaymentRequested || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Maker Done:</span><span>{formatINR(detail.poTotalMakerDone || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Payment Done:</span><span>{formatINR(detail.poTotalPaymentDone || 0)}</span></div>
                            <div className="pt-2">
                                <a href={purchaseOrderApi.getPurchaseOrderPdfUrl(detail.purchaseOrderId)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                                    View Latest PO PDF
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                {detail.vendorWorkOrderId && (
                    <div className="col-span-2 space-y-2">
                        <Label className="text-muted-foreground text-xs">VWO Details</Label>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">VWO Number:</span>
                                <span className="font-medium">{detail.vwoNumber || `#${detail.vendorWorkOrderId}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">VWO File:</span>
                                <a href={vendorWorkOrderApi.getPdfDownloadUrl(detail.vendorWorkOrderId)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Download VWO</a>
                            </div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Grand Total:</span><span>{formatINR(detail.vwoGrandTotal || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">TDS %:</span><span>{detail.vwoTdsPercentage || "0"}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">TDS Amount:</span><span>{formatINR(detail.vwoTdsAmount || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Amount After TDS:</span><span>{formatINR(detail.vwoAmountAfterTds || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Payment Requested:</span><span>{formatINR(detail.vwoTotalPaymentRequested || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Maker Done:</span><span>{formatINR(detail.vwoTotalMakerDone || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Payment Done:</span><span>{formatINR(detail.vwoTotalPaymentDone || 0)}</span></div>
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
        <Dialog open={viewingId !== null} onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payment Request Details</DialogTitle>
                    <DialogDescription>Full details of the selected request</DialogDescription>
                </DialogHeader>
                {dialogContent}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
