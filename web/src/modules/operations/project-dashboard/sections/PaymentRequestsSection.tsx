import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentRequestDetails, useProjectPaymentRequests } from "@/hooks/api/useProjectPaymentRequests";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import type { ColDef, GridApi, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Eye, Edit, Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tenderFilesService } from "@/services/api/tender-files.service";

const PAYMENT_AGAINST_LABELS: Record<string, string> = {
    upload_invoice: "Upload Invoice",
    new_pi: "New PI",
    po: "PO",
    others: "Imprest",
    imprest: "Imprest",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
    maker_done: { label: "Maker Done", color: "text-blue-600 bg-blue-50" },
    payment_done: { label: "Payment Done", color: "text-green-600 bg-green-50" },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50" },
};

interface PaymentRequestsSectionProps {
    projectId: number | null;
}

export const PaymentRequestsSection: React.FC<PaymentRequestsSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [prGridApi, setPrGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectPaymentRequests(projectId!);

    const paymentRequests = data ?? [];

    const [viewingId, setViewingId] = useState<number | null>(null);
    const { data: detailData, isLoading: isDetailLoading } = usePaymentRequestDetails(viewingId ?? 0);

    const detail = detailData ?? null;

    const handleView = useMemo(() => (row: PaymentRequestRow) => setViewingId(row.id), []);

    const prActions: ActionItem<PaymentRequestRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: handleView,
        },
        {
            label: "Edit Request",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editProjectPaymentRequestPage(row.id, projectId!)),
        },
    ], [navigate, projectId, handleView]);

    const prColumns = useMemo<ColDef<PaymentRequestRow>[]>(() => [
        {
            field: "requestNo",
            headerName: "Request No",
            sortable: true,
            filter: true,
            width: 250,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "partyName",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) => formatINR(p.value),
        },
        {
            field: "paymentAgainst",
            headerName: "Payment Against",
            sortable: true,
            filter: true,
            width: 140,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) =>
                PAYMENT_AGAINST_LABELS[p.value] || p.value || "-",
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => {
                const status = p.value || "pending";
                const colors: Record<string, string> = {
                    pending: "text-yellow-600 bg-yellow-50",
                    approved: "text-green-600 bg-green-50",
                    rejected: "text-red-600 bg-red-50",
                };
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || ""}`}>
                        {status}
                    </span>
                );
            },
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<PaymentRequestRow>(prActions),
            width: 80,
            pinned: "right" as "right" | "left",
        },
    ], [navigate]);

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="w-full">
                        <div className="flex justify-between items-center gap-2">
                            <CardTitle className="text-base font-semibold">
                                Payment Requests
                            </CardTitle>
                            <CardAction>
                                <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raiseProjectPaymentRequestForm(projectId))}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Request for Payment
                                </Button>
                            </CardAction>
                        </div>
                        <CardDescription>
                            {paymentRequests.length} request{paymentRequests.length !== 1 ? 's' : ''} found
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <DataTable
                        data={paymentRequests}
                        columnDefs={prColumns}
                        onGridReady={(params) => setPrGridApi(params.api)}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 5,
                            domLayout: 'autoHeight',
                        }}
                    />
                </CardContent>
            </Card>

            {/* ── View Details Modal ── */}
            <Dialog open={viewingId !== null} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment Request Details</DialogTitle>
                        <DialogDescription>
                            Full details of the selected payment request
                        </DialogDescription>
                    </DialogHeader>
                    {isDetailLoading ? (
                        <div className="space-y-4 py-4">
                            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : detail ? (
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
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">PO Reference</Label>
                                    <p>{detail.poNumber || `#${detail.purchaseOrderId}`}</p>
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
                    ) : (
                        <p className="text-muted-foreground py-4 text-center">No details found.</p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
