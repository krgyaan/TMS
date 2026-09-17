import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { FileUploader } from "@/components/file-upload";
import { Combobox, type SelectOption } from "@/components/form/SelectField";
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
import { useAuth } from "@/contexts/AuthContext";
import { useAllPaymentRequests, useRevertPaymentRequestStatus, useUpdatePaymentRequestStatus, useUploadPaymentInvoiceAfterPayment } from "@/hooks/api/useProjectPaymentRequests";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { referenceName } from "@/lib/id-utils";
import { PaymentRequestViewModal } from "@/modules/operations/payment-requests/components/PaymentRequestViewModal";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import { calculateTds } from "@/modules/operations/payment-requests/helpers/tds-calculator";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Ban, Banknote, CheckCircle2, Copy, Eye, RotateCcw, Search, Upload } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { PAYMENT_AGAINST_LABELS, STATUS_CONFIG } from "./constants";

type SubTab = "all" | "pending" | "payment_done" | "rejected";

const CombinedPaymentRequestListPage: React.FC = () => {
    const location = useLocation();
    const { teamId } = useTeamFilter();
    const { user } = useAuth();
    const isOperationsSection = location.pathname.includes("/operations/");
    const effectiveTeamId = isOperationsSection ? teamId : undefined;
    const { data, isLoading } = useAllPaymentRequests(effectiveTeamId ?? undefined);
    const updateStatusMutation = useUpdatePaymentRequestStatus();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    const [viewingId, setViewingId] = useState<number | null>(null);

    const [makerDoneRow, setMakerDoneRow] = useState<PaymentRequestRow | null>(null);
    const [paymentDoneRow, setPaymentDoneRow] = useState<PaymentRequestRow | null>(null);
    const [utrNumber, setUtrNumber] = useState("");
    const [rejectRow, setRejectRow] = useState<PaymentRequestRow | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const [uploadInvoiceRow, setUploadInvoiceRow] = useState<PaymentRequestRow | null>(null);
    const [uploadInvoiceFiles, setUploadInvoiceFiles] = useState<string[]>([]);
    const [uploadInvoiceError, setUploadInvoiceError] = useState("");
    const uploadInvoiceMutation = useUploadPaymentInvoiceAfterPayment();

    const [revertRow, setRevertRow] = useState<PaymentRequestRow | null>(null);
    const [revertStatus, setRevertStatus] = useState("");
    const [revertRemark, setRevertRemark] = useState("");
    const revertMutation = useRevertPaymentRequestStatus();

    const rows = useMemo(() => (data ?? []) as PaymentRequestRow[], [data]);

    const visibleRows = useMemo(() => {
        const currentTeamId = user?.team?.id ?? null;
        const currentUserId = user?.id ?? null;

        const team5Categories = new Set([
            'electricity', 'rent', 'emi', 'nbfc_oc_acc', 'loan_principal_return',
            'AU_5242', 'AU_5180', 'AU_5190', 'AU_8316', 'AU_9589', 'AU_9284', 'amex_cc',
        ]);
        // 'imprest', 'others', 'communication', 'courier', 'asset_purchase', 'software', 'office_expenses',
        // 'printing_stationary', 'office_maintenance', 'portal_renewal_charges', 'professional_charges'
        const userAllowedCategories: Record<string, number[]> = {
            salary: [13, 7, 21, 42, 26],
            related_party: [13, 7, 21, 26],
            investment: [13, 7, 21, 26],
        };

        return rows.filter((row) => {
            // Hide po_approval_pending from accounts side
            if (!isOperationsSection && row.status === "po_approval_pending") {
                return false;
            }
            const category = row.paymentAgainst;
            if (team5Categories.has(category)) {
                return currentTeamId === 5 || currentUserId === 7 || currentUserId === 21 || currentUserId === 13;
            }
            const allowedUsers = userAllowedCategories[category];
            if (allowedUsers) {
                return currentUserId !== null && allowedUsers.includes(currentUserId);
            }
            return true;
        });
    }, [rows, user?.team?.id, user?.id, isOperationsSection]);

    const { activeTab: activeSubTab, setActiveTab: setActiveSubTab } = usePersistentTableState<SubTab>({
        storageKey: "payment-requests-combined-subtab",
        defaultTab: "all",
        tabParam: "subtab",
    });

    const filteredRows = useMemo(() => {
        if (activeSubTab === "all") return visibleRows;
        if (activeSubTab === "payment_done") return visibleRows.filter((r) => r.status === "payment_done");
        if (activeSubTab === "rejected") return visibleRows.filter((r) => r.status === "rejected");
        return visibleRows.filter((r) => r.status === "pending" || r.status === "maker_done" || r.status === "po_approval_pending");
    }, [visibleRows, activeSubTab]);

    const subtabCounts = useMemo(() => ({
        all: visibleRows.length,
        pending: visibleRows.filter((r) => r.status === "pending" || r.status === "maker_done" || r.status === "po_approval_pending").length,
        payment_done: visibleRows.filter((r) => r.status === "payment_done").length,
        rejected: visibleRows.filter((r) => r.status === "rejected").length,
    }), [visibleRows]);

    const revertStatusOptions: SelectOption[] = useMemo(
        () => Object.entries(STATUS_CONFIG).map(([key, config]) => ({ id: key, name: config.label })),
        [],
    );

    const onGridReady = useCallback((event: GridReadyEvent<PaymentRequestRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const handleView = useCallback((row: PaymentRequestRow) => setViewingId(row.id), []);
    const handleMakerDone = useCallback((row: PaymentRequestRow) => setMakerDoneRow(row), []);
    const handlePaymentDone = useCallback((row: PaymentRequestRow) => { setPaymentDoneRow(row); setUtrNumber(""); }, []);
    const handleReject = useCallback((row: PaymentRequestRow) => { setRejectRow(row); setRejectionReason(""); }, []);

    const handleUploadInvoice = useCallback((row: PaymentRequestRow) => {
        setUploadInvoiceRow(row);
        setUploadInvoiceFiles([]);
        setUploadInvoiceError("");
    }, []);

    const handleRevert = useCallback((row: PaymentRequestRow) => {
        setRevertRow(row);
        setRevertStatus("");
        setRevertRemark("");
    }, []);

    const CATEGORIES_NEED_INVOICE_AFTER_PAYMENT = useMemo(() => new Set([
        'rent', 'software', 'printing_stationary', 'office_maintenance', 'portal_renewal_charges', 'professional_charges',
        'gem_charges',
    ]), []);

    const confirmUploadInvoice = useCallback(async () => {
        if (!uploadInvoiceRow) return;
        if (uploadInvoiceFiles.length === 0) {
            setUploadInvoiceError("Please upload at least one file");
            return;
        }
        try {
            await uploadInvoiceMutation.mutateAsync({ id: uploadInvoiceRow.id, files: uploadInvoiceFiles });
            toast.success("Invoice uploaded successfully.");
            setUploadInvoiceRow(null);
            setUploadInvoiceFiles([]);
            setUploadInvoiceError("");
        } catch {
            toast.error("Failed to upload invoice.");
        }
    }, [uploadInvoiceRow, uploadInvoiceFiles, uploadInvoiceMutation]);

    const confirmMakerDone = useCallback(async () => {
        if (!makerDoneRow) return;
        try { await updateStatusMutation.mutateAsync({ id: makerDoneRow.id, data: { status: "maker_done" } }); setMakerDoneRow(null); } catch {}
    }, [makerDoneRow, updateStatusMutation]);

    const confirmPaymentDone = useCallback(async () => {
        if (!paymentDoneRow || !utrNumber.trim()) return;
        try {
            await updateStatusMutation.mutateAsync({ id: paymentDoneRow.id, data: { status: "payment_done", utrNumber: utrNumber.trim() } });
            setPaymentDoneRow(null);
            setUtrNumber("");
        } catch {}
    }, [paymentDoneRow, utrNumber, updateStatusMutation]);

    const confirmReject = useCallback(async () => {
        if (!rejectRow || !rejectionReason.trim()) return;
        try { 
            await updateStatusMutation.mutateAsync(
                { 
                    id: rejectRow.id, 
                    data: { status: "rejected", rejectionReason: rejectionReason.trim() } 
                }
            ); 
            setRejectRow(null); setRejectionReason(""); } catch {}
    }, [rejectRow, rejectionReason, updateStatusMutation]);

    const confirmRevert = useCallback(async () => {
        if (!revertRow || !revertStatus || !revertRemark.trim()) return;
        try {
            await revertMutation.mutateAsync({
                id: revertRow.id,
                data: { status: revertStatus, remark: `Status Reverted - ${revertRemark.trim()}` },
            });
            toast.success("Payment request reverted successfully");
            setRevertRow(null);
            setRevertStatus("");
            setRevertRemark("");
        } catch {
            toast.error("Failed to revert payment request");
        }
    }, [revertRow, revertStatus, revertRemark, revertMutation]);

    const actions: ActionItem<PaymentRequestRow>[] = useMemo(() => [
        { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: handleView },
        { label: "Maker Done", icon: <CheckCircle2 className="h-4 w-4" />, onClick: handleMakerDone, visible: (row) => row.status === "pending" },
        { label: "Payment Done", icon: <Banknote className="h-4 w-4" />, onClick: handlePaymentDone, visible: (row) => row.status === "maker_done" },
        {
            label: "Upload Invoice",
            icon: <Upload className="h-4 w-4" />,
            onClick: handleUploadInvoice,
            visible: (row) => row.status !== "rejected" && row.status !== "po_approval_pending" && CATEGORIES_NEED_INVOICE_AFTER_PAYMENT.has(row.paymentAgainst),
        },
        { label: "Reject", icon: <Ban className="h-4 w-4" />, onClick: handleReject, className: "text-red-600", visible: (row) => row.status === "pending" || row.status === "maker_done" },
        {
            label: "Revert",
            icon: <RotateCcw className="h-4 w-4" />,
            onClick: handleRevert,
            visible: (row) => !isOperationsSection && ["rejected", "payment_done", "maker_done"].includes(row.status),
        },
    ], [handleView, handleMakerDone, handlePaymentDone, handleUploadInvoice, handleReject, handleRevert, CATEGORIES_NEED_INVOICE_AFTER_PAYMENT, isOperationsSection]);

    const columns = useMemo<ColDef<PaymentRequestRow>[]>(() => [
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
                            <span>{referenceName(p.value)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "projectName",
            headerName: "Project Name",
            sortable: true,
            filter: true,
            width: 200,
            cellRenderer: ({ value }: CustomCellRendererProps<PaymentRequestRow>) => {
                if (!value) return <span className="text-muted-foreground">Maker Request</span>;
                return <span className="capitalize">{value}</span>;
            },
        },
        { 
            field: "partyName", 
            headerName: "Party Name", 
            sortable: true, 
            filter: true, 
            flex: 1, 
            minWidth: 150,
            cellRenderer: ({ value, data }: CustomCellRendererProps<PaymentRequestRow>) => {
                if (value) {
                    return <span className="capitalize">{value.toLowerCase()}</span>;
                }
                if (!data?.portalLink) return null;
                return (
                    <button
                        type="button"
                        onClick={async () => {
                            await navigator.clipboard.writeText(data?.portalLink ?? "No Link");
                            toast.success(`Portal link copied to clipboard - ${data?.portalLink ?? "No Link"}`);
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        title={data?.portalLink ?? "No Link"}
                    >
                        <Copy size={16} />
                        <span>Copy Link</span>
                    </button>
                );
            },

        },
        {
            field: "netPayable" as keyof PaymentRequestRow,
            headerName: "Net Payable",
            sortable: false,
            valueGetter: (p) => {
                const amount = Number(p.data?.amount || 0);
                const tdsPct = Number(p.data?.tdsPercentage || 0);
                return tdsPct > 0 ? calculateTds(amount, tdsPct).netPayable : amount;
            },
            valueFormatter: (p: ValueFormatterParams) => formatINR(p.value),
        },
        {
            field: "paymentAgainst",
            headerName: "Category",
            sortable: true,
            filter: true,
            width: 140,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) =>
                PAYMENT_AGAINST_LABELS[p.value] || p.value || "-",
        },
        {
            field: "paymentMode",
            headerName: "Mode",
            sortable: true,
            filter: true,
            maxWidth: 80,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => {
                const mode = p.value == 'BANK_TRANSFER' ? "NEFT" : p.value?.toLowerCase();
                return <span className="capitalize">{mode}</span>;
            },
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 130,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => {
                const config = STATUS_CONFIG[p.value] || { label: p.value, color: "" };
                return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
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
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) => formatDateTime(p.value),
        },
        {
            headerName: "",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<PaymentRequestRow>(actions),
            width: 80,
            pinned: "right" as const,
        },
    ], [actions]);

    return (
        <>
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-base font-semibold">Payment Requests</CardTitle>
                    </div>
                    <CardDescription>{filteredRows.length} request{filteredRows.length !== 1 ? "s" : ""} found</CardDescription>
                    <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SubTab)}>
                        <TabsList className="m-auto mb-0">
                            <TabsTrigger value="all" className="data-[state=active]:shadow-md flex items-center gap-1">
                                All
                                <Badge variant="secondary" className="text-xs">{subtabCounts.all}</Badge>
                            </TabsTrigger>
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
                            <Input type="text" placeholder="Search ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-64 w-full rounded-lg" />
                    ) : (
                        <DataTable data={filteredRows} columnDefs={columns} onGridReady={onGridReady} gridOptions={{ pagination: true, paginationPageSize: 100, domLayout: "autoHeight" }} />
                    )}
                </CardContent>
            </Card>
            {/* View Modal */}
            <PaymentRequestViewModal
                viewingId={viewingId}
                onClose={() => setViewingId(null)}
            />


            {/* Maker Done Dialog */}
            <Dialog open={makerDoneRow !== null} onOpenChange={(open) => { if (!open) setMakerDoneRow(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Maker Done</DialogTitle>
                        <DialogDescription>Mark this request as "Maker Done"?</DialogDescription>
                    </DialogHeader>
                    {makerDoneRow &&
                        <div className="space-y-2 py-2">
                            <p><strong>Request No:</strong> {makerDoneRow.requestNo}</p>
                            <p><strong>Party:</strong> {makerDoneRow.partyName}</p>
                            <p><strong>Amount:</strong> {formatINR(makerDoneRow.amount)}</p>
                        </div>
                    }
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMakerDoneRow(null)}>Cancel</Button>
                        <Button onClick={confirmMakerDone} disabled={updateStatusMutation.isPending}>{updateStatusMutation.isPending ? "Updating..." : "Confirm"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Done Dialog */}
            <Dialog open={paymentDoneRow !== null} onOpenChange={(open) => { if (!open) { setPaymentDoneRow(null); setUtrNumber(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Payment Done</DialogTitle>
                        <DialogDescription>Enter the UTR number to confirm payment completion</DialogDescription>
                    </DialogHeader>
                    {paymentDoneRow &&
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <p className="text-sm"><strong>Request No:</strong> {paymentDoneRow.requestNo}</p>
                                <p className="text-sm"><strong>Party:</strong> {paymentDoneRow.partyName}</p>
                                <p className="text-sm"><strong>Amount:</strong> {formatINR(paymentDoneRow.amount)}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="utr">UTR Number <span className="text-destructive">*</span></Label>
                                <Input id="utr" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} placeholder="e.g. SBIN1234567890" className="font-mono" />
                            </div>
                        </div>
                    }
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setPaymentDoneRow(null); setUtrNumber(""); }}>Cancel</Button>
                        <Button onClick={confirmPaymentDone} disabled={!utrNumber.trim() || updateStatusMutation.isPending}>{updateStatusMutation.isPending ? "Submitting..." : "Submit"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectRow !== null} onOpenChange={(open) => { if (!open) { setRejectRow(null); setRejectionReason(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                        <DialogDescription>Provide a reason for rejecting this request</DialogDescription>
                    </DialogHeader>
                    {rejectRow &&
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <p className="text-sm"><strong>Request No:</strong> {rejectRow.requestNo}</p>
                                <p className="text-sm"><strong>Party:</strong> {rejectRow.partyName}</p>
                                <p className="text-sm"><strong>Amount:</strong> {formatINR(rejectRow.amount)}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reject-reason">Reason for Rejection <span className="text-destructive">*</span></Label>
                                <Textarea id="reject-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this request is rejected..." rows={3} />
                            </div>
                        </div>
                    }
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectRow(null); setRejectionReason(""); }}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={!rejectionReason.trim() || updateStatusMutation.isPending}>{updateStatusMutation.isPending ? "Rejecting..." : "Reject"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upload Invoice after Payment Dialog */}
            <Dialog open={uploadInvoiceRow !== null} onOpenChange={(open) => { if (!open) { setUploadInvoiceRow(null); setUploadInvoiceFiles([]); setUploadInvoiceError(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Invoice after Payment</DialogTitle>
                        <DialogDescription>Upload the invoice for this request after payment has been made</DialogDescription>
                    </DialogHeader>
                    {uploadInvoiceRow &&
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <p className="text-sm"><strong>Request No:</strong> {uploadInvoiceRow.requestNo}</p>
                                <p className="text-sm"><strong>Party:</strong> {uploadInvoiceRow.partyName}</p>
                                <p className="text-sm"><strong>Amount:</strong> {formatINR(uploadInvoiceRow.amount)}</p>
                            </div>
                            <div className="space-y-1">
                                <FileUploader
                                    label="Upload Invoice"
                                    context="tender-documents"
                                    value={uploadInvoiceFiles}
                                    onChange={(files) => { setUploadInvoiceFiles(files); setUploadInvoiceError(""); }}
                                />
                                {uploadInvoiceError && (
                                    <p className="text-sm text-destructive">{uploadInvoiceError}</p>
                                )}
                            </div>
                        </div>
                    }
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setUploadInvoiceRow(null); setUploadInvoiceFiles([]); setUploadInvoiceError(""); }}>Cancel</Button>
                        <Button onClick={confirmUploadInvoice} disabled={uploadInvoiceMutation.isPending}>
                            {uploadInvoiceMutation.isPending ? "Uploading..." : "Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert Status Dialog */}
            <Dialog open={revertRow !== null} onOpenChange={(open) => { if (!open) { setRevertRow(null); setRevertStatus(""); setRevertRemark(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Revert Payment Request</DialogTitle>
                        <DialogDescription>Change the status of this payment request</DialogDescription>
                    </DialogHeader>
                    {revertRow &&
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <p className="text-sm"><strong>Request No:</strong> {revertRow.requestNo}</p>
                                <p className="text-sm"><strong>Party:</strong> {revertRow.partyName}</p>
                                <p className="text-sm"><strong>Amount:</strong> {formatINR(revertRow.amount)}</p>
                                <p className="text-sm"><strong>Current Status:</strong> <Badge variant="outline" className={STATUS_CONFIG[revertRow.status]?.color || ""}>{STATUS_CONFIG[revertRow.status]?.label || revertRow.status}</Badge></p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="revert-status">New Status <span className="text-destructive">*</span></Label>
                                <Combobox
                                    value={revertStatus}
                                    onChange={setRevertStatus}
                                    options={revertStatusOptions}
                                    placeholder="Select status..."
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="revert-remark">Remark <span className="text-destructive">*</span></Label>
                                <Textarea id="revert-remark" value={revertRemark} onChange={(e) => setRevertRemark(e.target.value)} placeholder="Explain why this request is being reverted..." rows={3} />
                            </div>
                        </div>
                    }
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRevertRow(null); setRevertStatus(""); setRevertRemark(""); }}>Cancel</Button>
                        <Button onClick={confirmRevert} disabled={!revertStatus || !revertRemark.trim() || revertMutation.isPending}>
                            {revertMutation.isPending ? "Reverting..." : "Revert"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CombinedPaymentRequestListPage;
