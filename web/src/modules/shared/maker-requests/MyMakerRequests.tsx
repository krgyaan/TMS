import { paths } from "@/app/routes/paths";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMakerRequestDetails, useMyMakerRequests } from "@/hooks/api/useMakerRequests";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { getShortId } from "@/lib/id-utils";
import type { MakerRequestRow } from "@/modules/shared/maker-requests/helpers/makerRequest.types";
import { tenderFilesService } from "@/services/api/tender-files.service";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useUploadMakerInvoiceAfterPayment } from "@/hooks/api/useMakerRequests";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Copy, Eye, Plus, Search, Upload } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PAYMENT_AGAINST_LABELS, STATUS_CONFIG } from "../payment-requests/constants";
import { toast } from "sonner";

const MyMakerRequests: React.FC = () => {
    const navigate = useNavigate();
    const { data, isLoading } = useMyMakerRequests();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    const [viewingId, setViewingId] = useState<number | null>(null);
    const { data: detailData, isLoading: isDetailLoading } = useMakerRequestDetails(viewingId ?? 0);
    const [uploadInvoiceRow, setUploadInvoiceRow] = useState<MakerRequestRow | null>(null);
    const [uploadInvoiceFiles, setUploadInvoiceFiles] = useState<string[]>([]);
    const [uploadInvoiceError, setUploadInvoiceError] = useState("");
    const uploadInvoiceMutation = useUploadMakerInvoiceAfterPayment();

    const rows = useMemo(() => (data ?? []) as MakerRequestRow[], [data]);

    const { activeTab: activeSubTab, setActiveTab: setActiveSubTab } = usePersistentTableState<"pending" | "payment_done" | "rejected">({
        storageKey: "my-maker-requests-subtab",
        defaultTab: "pending",
        tabParam: "subtab",
    });

    const filteredRows = useMemo(() => {
        if (activeSubTab === "payment_done") return rows.filter((r) => r.status === "payment_done");
        if (activeSubTab === "rejected") return rows.filter((r) => r.status === "rejected");
        return rows.filter((r) => r.status === "pending" || r.status === "maker_done");
    }, [rows, activeSubTab]);

    const subtabCounts = useMemo(() => ({
        pending: rows.filter((r) => r.status === "pending" || r.status === "maker_done").length,
        payment_done: rows.filter((r) => r.status === "payment_done").length,
        rejected: rows.filter((r) => r.status === "rejected").length,
    }), [rows]);

    const onGridReady = useCallback((event: GridReadyEvent<MakerRequestRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const handleView = useCallback((row: MakerRequestRow) => setViewingId(row.id), []);

    const handleUploadInvoice = useCallback((row: MakerRequestRow) => {
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

    const mrActions: ActionItem<MakerRequestRow>[] = useMemo(() => [
        { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: handleView },
        {
            label: "Upload Invoice",
            icon: <Upload className="h-4 w-4" />,
            onClick: handleUploadInvoice,
            visible: (row) => row.status !== "rejected" && !!row.category && CATEGORIES_NEED_INVOICE_AFTER_PAYMENT.has(row.category),
        },
    ], [handleView, handleUploadInvoice, CATEGORIES_NEED_INVOICE_AFTER_PAYMENT]);

    const mrColumns = useMemo<ColDef<MakerRequestRow>[]>(() => [
        { field: "requestNo", headerName: "Request No", sortable: true, filter: true, width: 260, flex: 1, cellRenderer: (p: CustomCellRendererProps<MakerRequestRow>) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="font-mono text-sm font-medium">{getShortId(p.value)}</span>
                    </TooltipTrigger>
                    <TooltipContent>{p.value}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ) },
        { 
            field: "partyName", 
            headerName: "Party Name", 
            sortable: true, 
            filter: true, 
            flex: 1, 
            minWidth: 150,
            cellRenderer: ({ value, data }: CustomCellRendererProps<MakerRequestRow>) => {
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
            field: "paymentMode",
            headerName: "Mode",
            sortable: true,
            filter: true,
            width: 120,
            cellRenderer: (p: CustomCellRendererProps<MakerRequestRow>) => {
                const mode = p.value.replaceAll('_', ' ').toLowerCase();
                return <span className="capitalize">{mode}</span>;
            },
        },
        { 
            field: "amount", 
            headerName: "Amount", 
            sortable: true, 
            valueFormatter: (p: ValueFormatterParams<MakerRequestRow>) => formatINR(p.value) 
        },
        { 
            field: "category", 
            headerName: "Category", 
            sortable: true, 
            filter: true, 
            width: 140,
            valueFormatter: (p: ValueFormatterParams<MakerRequestRow>) => PAYMENT_AGAINST_LABELS[p.value] || p.value || "-",
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 130
        },
        { 
            field: "createdAt", 
            headerName: "Created At", 
            sortable: true, 
            filter: true, 
            width: 130, 
            valueFormatter: (p: ValueFormatterParams<MakerRequestRow>) => formatDate(p.value) 
        },
        { headerName: "Actions", filter: false, sortable: false, cellRenderer: createActionColumnRenderer<MakerRequestRow>(mrActions), width: 80, pinned: "right" as const },
    ], []);

    const detail = detailData as MakerRequestRow | undefined;

    return (
        <>
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-base font-semibold">My Maker Requests</CardTitle>
                        <Button size="sm" onClick={() => navigate(paths.shared.makerRequestCreate)}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New Request
                        </Button>
                    </div>
                    <CardDescription>{filteredRows.length} request{filteredRows.length !== 1 ? "s" : ""} found</CardDescription>
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
                            <Input type="text" placeholder="Search ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-64 w-full rounded-lg" />
                    ) : (
                        <DataTable 
                            data={filteredRows} 
                            columnDefs={mrColumns} 
                            onGridReady={onGridReady} 
                            gridOptions={
                                { 
                                    pagination: true, 
                                    paginationPageSize: 100, 
                                    domLayout: "autoHeight" 
                                }
                            }
                        />
                    )}
                </CardContent>
            </Card>

            <Dialog open={viewingId !== null} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Maker Request Details</DialogTitle>
                        <DialogDescription>Full details of the selected maker request</DialogDescription>
                    </DialogHeader>
                    {isDetailLoading ? (
                        <div className="space-y-4 py-4">{ [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />) }</div>
                    ) : detail ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
                            <div className="col-span-2">
                                <Label className="text-muted-foreground text-xs">Request No</Label><p className="font-mono font-medium">{detail.requestNo}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Party Name</Label><p>{detail.partyName}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Amount</Label><p className="font-medium">{formatINR(detail.amount)}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Category</Label><p>{detail.category || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Payment Mode</Label>
                                <p className="capitalize">{detail.paymentMode?.replaceAll('_', ' ').toLowerCase() || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Account Number</Label><p className="font-mono">{detail.accountNumber}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Bank Name</Label><p>{detail.bankName || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">IFSC</Label><p className="font-mono">{detail.ifsc}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Requested By</Label><p>{detail.requestedByName || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Status</Label><Badge variant="outline" className={STATUS_CONFIG[detail.status]?.color || ""}>{STATUS_CONFIG[detail.status]?.label || detail.status}</Badge>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Created At</Label><p>{formatDate(detail.createdAt)}</p>
                            </div>
                            {detail.portalLink && 
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Portal Link</Label>
                                    <p className="font-mono text-sm truncate">{detail.portalLink}</p>
                                </div>
                            }
                            {detail.utrNumber && 
                                <div>
                                    <Label className="text-muted-foreground text-xs">UTR Number</Label><p className="font-mono">{detail.utrNumber}</p>
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
                                        {detail.billFiles.map((f, i) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detail.uploadInvoice?.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Upload Invoice</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.uploadInvoice.map((f, i) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detail.uploadPI?.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Upload PI</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.uploadPI.map((f, i) => (
                                            <a key={i} href={tenderFilesService.getFileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">File {i + 1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detail.uploadInvoiceAfterPayment?.length > 0 && (
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground text-xs">Upload Invoice after Payment</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {detail.uploadInvoiceAfterPayment.map((f, i) => (
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
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Grand Total:</span>
                                            <span>{formatINR(detail.poGrandTotal || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">TDS %:</span>
                                            <span>{detail.poTdsPercentage || "0"}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">TDS Amount:</span>
                                            <span>{formatINR(detail.poTdsAmount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Amount After TDS:</span>
                                            <span>{formatINR(detail.poAmountAfterTds || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Requested:</span>
                                            <span>{formatINR(detail.poTotalPaymentRequested || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Maker Done:</span>
                                            <span>{formatINR(detail.poTotalMakerDone || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Done:</span>
                                            <span>{formatINR(detail.poTotalPaymentDone || 0)}</span>
                                        </div>
                                        {detail.uploadedInvoiceFile && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Uploaded Invoice:</span>
                                                <a href={tenderFilesService.getFileUrl(detail.uploadedInvoiceFile)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Download Invoice</a>
                                            </div>
                                        )}
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
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Grand Total:</span>
                                            <span>{formatINR(detail.vwoGrandTotal || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">TDS %:</span>
                                            <span>{detail.vwoTdsPercentage || "0"}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">TDS Amount:</span>
                                            <span>{formatINR(detail.vwoTdsAmount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Amount After TDS:</span>
                                            <span>{formatINR(detail.vwoAmountAfterTds || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Requested:</span>
                                            <span>{formatINR(detail.vwoTotalPaymentRequested || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Maker Done:</span>
                                            <span>{formatINR(detail.vwoTotalMakerDone || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Done:</span>
                                            <span>{formatINR(detail.vwoTotalPaymentDone || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : <p className="text-muted-foreground py-4 text-center">No details found.</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
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

export default MyMakerRequests;