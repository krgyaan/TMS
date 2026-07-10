import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllPaymentRequests, useUpdatePaymentRequestStatus } from "@/hooks/api/useProjectPaymentRequests";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Ban, Banknote, CheckCircle2, Eye, Search } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PAYMENT_AGAINST_LABELS, PaymentRequestDetailDialog, STATUS_CONFIG } from "./components/PaymentRequestDetailDialog";

const PaymentRequestListPage: React.FC = () => {
    const { data, isLoading } = useAllPaymentRequests();
    const updateStatusMutation = useUpdatePaymentRequestStatus();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    // View modal
    const [viewingId, setViewingId] = useState<number | null>(null);

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
        tabParam : "subtab"
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
                                paginationPageSize: 100,
                                domLayout: "autoHeight",
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            <PaymentRequestDetailDialog viewingId={viewingId} onClose={() => setViewingId(null)} />

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
