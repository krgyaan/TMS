import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Search, Eye, CheckCircle2, Ban, Banknote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { useAllPaymentRequests, usePaymentRequestDetails, useUpdatePaymentRequestStatus } from "@/hooks/api/useProjectPaymentRequests";
import { tenderFilesService } from "@/services/api/tender-files.service";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";

const PAYMENT_AGAINST_LABELS: Record<string, string> = {
    upload_invoice: "Upload Invoice",
    new_pi: "New PI",
    po: "PO",
    others: "Others",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
    maker_done: { label: "Maker Done", color: "text-blue-600 bg-blue-50" },
    payment_done: { label: "Payment Done", color: "text-green-600 bg-green-50" },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50" },
};

const PaymentRequestListPage: React.FC = () => {
    const { data, isLoading } = useAllPaymentRequests();
    const updateStatusMutation = useUpdatePaymentRequestStatus();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    // View modal
    const [viewingId, setViewingId] = useState<number | null>(null);
    const { data: detailData, isLoading: isDetailLoading } = usePaymentRequestDetails(viewingId ?? 0);

    // Maker Done dialog
    const [makerDoneRow, setMakerDoneRow] = useState<PaymentRequestRow | null>(null);

    // Payment Done dialog
    const [paymentDoneRow, setPaymentDoneRow] = useState<PaymentRequestRow | null>(null);
    const [utrNumber, setUtrNumber] = useState("");

    // Reject dialog
    const [rejectRow, setRejectRow] = useState<PaymentRequestRow | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const paymentRequests = useMemo(() => (data ?? []) as PaymentRequestRow[], [data]);

    const { activeTab: activeSubTab, setActiveTab: setActiveSubTab } = usePersistentTableState<"pending" | "payment_done" | "rejected">({
        storageKey: "payment-requests-pr-subtab",
        defaultTab: "pending",
    });

    const filteredRequests = useMemo(() => {
        if (activeSubTab === "payment_done") return paymentRequests.filter((r) => r.status === "payment_done");
        if (activeSubTab === "rejected") return paymentRequests.filter((r) => r.status === "rejected");
        return paymentRequests.filter((r) => r.status === "pending" || r.status === "maker_done");
    }, [paymentRequests, activeSubTab]);

    const subtabCounts = useMemo(() => ({
        pending: paymentRequests.filter((r) => r.status === "pending" || r.status === "maker_done").length,
        payment_done: paymentRequests.filter((r) => r.status === "payment_done").length,
        rejected: paymentRequests.filter((r) => r.status === "rejected").length,
    }), [paymentRequests]);

    const onGridReady = useCallback((event: GridReadyEvent<PaymentRequestRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const handleView = useCallback((row: PaymentRequestRow) => {
        setViewingId(row.id);
    }, []);

    const handleMakerDone = useCallback((row: PaymentRequestRow) => {
        setMakerDoneRow(row);
    }, []);

    const handlePaymentDone = useCallback((row: PaymentRequestRow) => {
        setPaymentDoneRow(row);
        setUtrNumber("");
    }, []);

    const handleReject = useCallback((row: PaymentRequestRow) => {
        setRejectRow(row);
        setRejectionReason("");
    }, []);

    const confirmMakerDone = useCallback(async () => {
        if (!makerDoneRow) return;
        try {
            await updateStatusMutation.mutateAsync({ id: makerDoneRow.id, data: { status: "maker_done" } });
            setMakerDoneRow(null);
        } catch { /* toast handled by mutation */ }
    }, [makerDoneRow, updateStatusMutation]);

    const confirmPaymentDone = useCallback(async () => {
        if (!paymentDoneRow || !utrNumber.trim()) return;
        try {
            await updateStatusMutation.mutateAsync({ id: paymentDoneRow.id, data: { status: "payment_done", utrNumber: utrNumber.trim() } });
            setPaymentDoneRow(null);
            setUtrNumber("");
        } catch { /* toast handled by mutation */ }
    }, [paymentDoneRow, utrNumber, updateStatusMutation]);

    const confirmReject = useCallback(async () => {
        if (!rejectRow || !rejectionReason.trim()) return;
        try {
            await updateStatusMutation.mutateAsync({ id: rejectRow.id, data: { status: "rejected", rejectionReason: rejectionReason.trim() } });
            setRejectRow(null);
            setRejectionReason("");
        } catch { /* toast handled by mutation */ }
    }, [rejectRow, rejectionReason, updateStatusMutation]);

    const prActions: ActionItem<PaymentRequestRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: handleView,
        },
        {
            label: "Maker Done",
            icon: <CheckCircle2 className="h-4 w-4" />,
            onClick: handleMakerDone,
            visible: (row) => row.status === "pending",
        },
        {
            label: "Payment Done",
            icon: <Banknote className="h-4 w-4" />,
            onClick: handlePaymentDone,
            visible: (row) => row.status === "maker_done",
        },
        {
            label: "Reject",
            icon: <Ban className="h-4 w-4" />,
            onClick: handleReject,
            className: "text-red-600",
            visible: (row) => row.status === "pending" || row.status === "maker_done",
        },
    ], [handleView, handleMakerDone, handlePaymentDone, handleReject]);

    const prColumns = useMemo<ColDef<PaymentRequestRow>[]>(() => [
        {
            field: "requestNo",
            headerName: "Request No",
            sortable: true,
            filter: true,
            width: 260,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
            width: 150,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) =>
                PAYMENT_AGAINST_LABELS[p.value] || p.value || "-",
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 130,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => {
                const config = STATUS_CONFIG[p.value] || { label: p.value, color: "" };
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                        {config.label}
                    </span>
                );
            },
        },
        {
            field: "requestedByName",
            headerName: "Requested By",
            sortable: true,
            filter: true,
            width: 150,
        },
        {
            field: "createdAt",
            headerName: "Created At",
            sortable: true,
            filter: true,
            width: 130,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) => formatDate(p.value),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<PaymentRequestRow>(prActions),
            width: 80,
            pinned: "right" as const,
        },
    ], [handleView, handleMakerDone, handlePaymentDone, handleReject]);

    const detail = detailData as PaymentRequestRow | undefined;

    return (
        <>
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                            Payment Requests
                        </CardTitle>
                    </div>
                    <CardDescription>
                        {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} found
                    </CardDescription>
                    <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as typeof activeSubTab)}>
                        <TabsList className="m-auto mb-0">
                            <TabsTrigger value="pending" className="data-[state=active]:shadow-md flex items-center gap-1">
                                Pending
                                <Badge variant="secondary" className="text-xs">{subtabCounts.pending}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="payment_done" className="data-[state=active]:shadow-md flex items-center gap-1">
                                Payment Done
                                <Badge variant="secondary" className="text-xs">{subtabCounts.payment_done}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="rejected" className="data-[state=active]:shadow-md flex items-center gap-1">
                                Rejected
                                <Badge variant="secondary" className="text-xs">{subtabCounts.rejected}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex justify-end">
                        <div className="relative mb-4">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-64 w-full rounded-lg" />
                    ) : (
                        <DataTable
                            data={filteredRequests}
                            columnDefs={prColumns}
                            onGridReady={onGridReady}
                            gridOptions={{
                                pagination: true,
                                paginationPageSize: 10,
                                domLayout: "autoHeight",
                            }}
                        />
                    )}
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
                            <div>
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
                                <div>
                                    <Label className="text-muted-foreground text-xs">PO Reference</Label>
                                    <p>{detail.poNumber || `#${detail.purchaseOrderId}`}</p>
                                </div>
                            )}
                            {detail.paymentAgainst === "new_pi" && detail.piPartyName && (
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

            {/* ── Maker Done Dialog ── */}
            <Dialog open={makerDoneRow !== null} onOpenChange={(open) => { if (!open) setMakerDoneRow(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Maker Done</DialogTitle>
                        <DialogDescription>
                            Mark this payment request as "Maker Done"?
                        </DialogDescription>
                    </DialogHeader>
                    {makerDoneRow && (
                        <div className="space-y-2 py-2">
                            <p><strong>Request No:</strong> {makerDoneRow.requestNo}</p>
                            <p><strong>Party:</strong> {makerDoneRow.partyName}</p>
                            <p><strong>Amount:</strong> {formatINR(makerDoneRow.amount)}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMakerDoneRow(null)}>Cancel</Button>
                        <Button onClick={confirmMakerDone} disabled={updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Payment Done Dialog ── */}
            <Dialog open={paymentDoneRow !== null} onOpenChange={(open) => { if (!open) { setPaymentDoneRow(null); setUtrNumber(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Payment Done</DialogTitle>
                        <DialogDescription>
                            Enter the UTR number to confirm payment completion
                        </DialogDescription>
                    </DialogHeader>
                    {paymentDoneRow && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <p className="text-sm"><strong>Request No:</strong> {paymentDoneRow.requestNo}</p>
                                <p className="text-sm"><strong>Party:</strong> {paymentDoneRow.partyName}</p>
                                <p className="text-sm"><strong>Amount:</strong> {formatINR(paymentDoneRow.amount)}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="utr">UTR Number <span className="text-destructive">*</span></Label>
                                <Input
                                    id="utr"
                                    value={utrNumber}
                                    onChange={(e) => setUtrNumber(e.target.value)}
                                    placeholder="e.g. SBIN1234567890"
                                    className="font-mono"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setPaymentDoneRow(null); setUtrNumber(""); }}>Cancel</Button>
                        <Button onClick={confirmPaymentDone} disabled={!utrNumber.trim() || updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? "Submitting..." : "Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Reject Dialog ── */}
            <Dialog open={rejectRow !== null} onOpenChange={(open) => { if (!open) { setRejectRow(null); setRejectionReason(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Payment Request</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this payment request
                        </DialogDescription>
                    </DialogHeader>
                    {rejectRow && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <p className="text-sm"><strong>Request No:</strong> {rejectRow.requestNo}</p>
                                <p className="text-sm"><strong>Party:</strong> {rejectRow.partyName}</p>
                                <p className="text-sm"><strong>Amount:</strong> {formatINR(rejectRow.amount)}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reject-reason">Reason for Rejection <span className="text-destructive">*</span></Label>
                                <Textarea
                                    id="reject-reason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Explain why this request is rejected..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectRow(null); setRejectionReason(""); }}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmReject}
                            disabled={!rejectionReason.trim() || updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? "Rejecting..." : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PaymentRequestListPage;
