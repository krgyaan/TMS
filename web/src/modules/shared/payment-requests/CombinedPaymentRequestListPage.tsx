import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Search, Eye, CheckCircle2, Ban, Banknote, Copy, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useAllPaymentRequests, usePaymentRequestDetails, useUpdatePaymentRequestStatus, useUploadPaymentInvoiceAfterPayment } from "@/hooks/api/useProjectPaymentRequests";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { getShortId } from "@/lib/id-utils";
import { tenderFilesService } from "@/services/api/tender-files.service";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { PAYMENT_AGAINST_LABELS, STATUS_CONFIG } from "./constants";
import { toast } from "sonner";

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

    const rows = useMemo(() => (data ?? []) as PaymentRequestRow[], [data]);

    const visibleRows = useMemo(() => {
        const currentTeamId = user?.team?.id ?? null;
        const currentUserId = user?.id ?? null;

        const team5Categories = new Set([
            'imprest', 'others', 'communication', 'courier', 'electricity',
            'rent', 'emi', 'software', 'office_expenses', 'printing_stationary',
            'office_maintenance', 'portal_renewal_charges', 'professional_charges',
            'nbfc_oc_acc', 'loan_principal_return',
            'AU_5242', 'AU_5180', 'AU_5190', 'AU_8316', 'AU_9589', 'AU_9284',
            'amex_cc', 'asset_purchase',
        ]);

        const userAllowedCategories: Record<string, number[]> = {
            salary: [13, 7, 21, 42, 26],
            related_party: [13, 7, 21, 26],
            investment: [13, 7, 21, 26],
        };

        return rows.filter((row) => {
            const category = row.paymentAgainst;
            // if (team5Categories.has(category)) {
            //     return currentTeamId === 5;
            // }
            const allowedUsers = userAllowedCategories[category];
            if (allowedUsers) {
                return currentUserId !== null && allowedUsers.includes(currentUserId);
            }
            return true;
        });
    }, [rows, user?.team?.id, user?.id]);

    const { activeTab: activeSubTab, setActiveTab: setActiveSubTab } = usePersistentTableState<SubTab>({
        storageKey: "payment-requests-combined-subtab",
        defaultTab: "all",
        tabParam: "subtab",
    });

    const filteredRows = useMemo(() => {
        if (activeSubTab === "all") return visibleRows;
        if (activeSubTab === "payment_done") return visibleRows.filter((r) => r.status === "payment_done");
        if (activeSubTab === "rejected") return visibleRows.filter((r) => r.status === "rejected");
        return visibleRows.filter((r) => r.status === "pending" || r.status === "maker_done");
    }, [visibleRows, activeSubTab]);

    const subtabCounts = useMemo(() => ({
        all: visibleRows.length,
        pending: visibleRows.filter((r) => r.status === "pending" || r.status === "maker_done").length,
        payment_done: visibleRows.filter((r) => r.status === "payment_done").length,
        rejected: visibleRows.filter((r) => r.status === "rejected").length,
    }), [visibleRows]);

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

    const CATEGORIES_NEED_INVOICE_AFTER_PAYMENT = useMemo(() => new Set([
        'rent', 'software', 'printing_stationary', 'office_maintenance', 'portal_renewal_charges', 'professional_charges',
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

    const actions: ActionItem<PaymentRequestRow>[] = useMemo(() => [
        { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: handleView },
        { label: "Maker Done", icon: <CheckCircle2 className="h-4 w-4" />, onClick: handleMakerDone, visible: (row) => row.status === "pending" },
        { label: "Payment Done", icon: <Banknote className="h-4 w-4" />, onClick: handlePaymentDone, visible: (row) => row.status === "maker_done" },
        {
            label: "Upload Invoice",
            icon: <Upload className="h-4 w-4" />,
            onClick: handleUploadInvoice,
            visible: (row) => row.status !== "rejected" && CATEGORIES_NEED_INVOICE_AFTER_PAYMENT.has(row.paymentAgainst),
        },
        { label: "Reject", icon: <Ban className="h-4 w-4" />, onClick: handleReject, className: "text-red-600", visible: (row) => row.status === "pending" || row.status === "maker_done" },
    ], [handleView, handleMakerDone, handlePaymentDone, handleUploadInvoice, handleReject, CATEGORIES_NEED_INVOICE_AFTER_PAYMENT]);

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
                            <span className="font-mono text-sm font-medium">{getShortId(p.value)}</span>
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
            field: "amount",
            headerName: "Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) => formatINR(p.value),
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
            width: 120,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => {
                const mode = p.value.replaceAll('_', ' ').toLowerCase();
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
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) => formatDate(p.value),
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

    const { data: detailData, isLoading: isDetailLoading } = usePaymentRequestDetails(viewingId ?? 0);
    const detail = detailData as PaymentRequestRow | undefined;

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
            <Dialog open={viewingId !== null} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment Request Details</DialogTitle>
                        <DialogDescription>Full details of the selected request</DialogDescription>
                    </DialogHeader>
                    {isDetailLoading ? (
                        <div className="space-y-4 py-4">{ [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />) }</div>
                    ) : detail ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
                            <div className="col-span-2">
                                <Label className="text-muted-foreground text-xs">Request No</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <p className="font-mono font-medium">{getShortId(detail.requestNo)}</p>
                                        </TooltipTrigger>
                                        <TooltipContent>{detail.requestNo}</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {detail.projectId != null && (
                                <div>
                                    <Label className="text-muted-foreground text-xs">Project</Label>
                                    <p>{detail.projectName || "—"}</p>
                                </div>
                            )}
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
                                <Label className="text-muted-foreground text-xs">Category</Label>
                                <p>{PAYMENT_AGAINST_LABELS[detail.paymentAgainst] || detail.paymentAgainst || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Payment Mode</Label>
                                <p>{detail.paymentMode || "BANK_TRANSFER"}</p>
                            </div>
                            {detail.portalLink && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Portal Link</Label>
                                    <p className="text-blue-600 underline break-all">{detail.portalLink}</p>
                                </div>
                            )}
                            <div>
                                <Label className="text-muted-foreground text-xs">Status</Label>
                                <Badge variant="outline" className={STATUS_CONFIG[detail.status]?.color || ""}>{STATUS_CONFIG[detail.status]?.label || detail.status}</Badge>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Requested By</Label>
                                <p>{detail.requestedByName || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Created At</Label>
                                <p>{formatDate(detail.createdAt)}</p>
                            </div>
                            {detail.utrNumber &&
                                <div>
                                    <Label className="text-muted-foreground text-xs">UTR Number</Label>
                                    <p className="font-mono">{detail.utrNumber}</p>
                                </div>
                            }
                            {detail.rejectionReason &&
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Rejection Reason</Label>
                                    <p className="text-red-600">{detail.rejectionReason}</p>
                                </div>
                            }
                            {detail.remark &&
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Remark</Label>
                                    <p>{detail.remark}</p>
                                </div>
                            }
                            {detail.billFiles && detail.billFiles.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Bill / Proof Files</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.billFiles.map((f: string, i: number) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detail.uploadInvoice?.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Upload Invoice</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.uploadInvoice.map((f: string, i: number) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detail.uploadPI?.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Upload PI</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.uploadPI.map((f: string, i: number) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detail.uploadInvoiceAfterPayment?.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Upload Invoice after Payment</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.uploadInvoiceAfterPayment.map((f: string, i: number) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
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
                                                <a href={tenderFilesService.getFileUrl(detail.poFile)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Download PO</a>
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
                    ) : (
                        <p className="text-muted-foreground py-4 text-center">No details found.</p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                <TenderFileUploader
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
        </>
    );
};

export default CombinedPaymentRequestListPage;
