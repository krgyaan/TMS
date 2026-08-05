import React, { useMemo, useState, useCallback, useEffect } from "react";
import { CheckCircle, Eye, FileUp, History, Search, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useNavigate, useLocation } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { getShortId } from "@/lib/id-utils";
import type { PurchaseOrderRow } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";
import { SetTdsDialog } from "./components/SetTdsDialog";
import { OrderProgressCell } from "@/components/OrderProgressCell";

interface PurchaseOrderListPageProps {
    purchaseOrders?: PurchaseOrderRow[];
    showApprovalAction?: boolean;
    search?: string;
    onSearchChange?: (value: string) => void;
}

const PurchaseOrderListPage: React.FC<PurchaseOrderListPageProps> = ({
    purchaseOrders: propPurchaseOrders,
    showApprovalAction,
    search: propSearch,
    onSearchChange: propOnSearchChange,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [internalSearch, setInternalSearch] = useState("");
    const search = propSearch !== undefined ? propSearch : internalSearch;
    const setSearch = propOnSearchChange ?? setInternalSearch;
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [poApproval, setPoApproval] = useState<PurchaseOrderRow | null>(null);

    const isAccountsSection = location.pathname.includes("/accounts/");
    const isApprovalEnabled = showApprovalAction ?? isAccountsSection;

    const purchaseOrders = propPurchaseOrders ?? [];

    const onGridReady = useCallback((event: GridReadyEvent<PurchaseOrderRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const poActions: ActionItem<PurchaseOrderRow>[] = useMemo(() => {
        const actions: ActionItem<PurchaseOrderRow>[] = [
            {
                label: "Upload Invoice",
                icon: <FileUp className="h-4 w-4" />,
                visible: (row) => Number(row.totalPiAmount || 0) < Number(row.grandTotal || 0),
                onClick: (row) => navigate(paths.operations.raiseProjectPurchaseInvoiceForm(row.projectId, row.id)),
            },
            {
                label: "View Details",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row) => navigate(paths.operations.viewPoPage(row.id, row.projectId)),
            },
            {
                label: "PDF Versions",
                icon: <History className="h-4 w-4" />,
                onClick: (row) => navigate(paths.operations.poPdfVersions(row.id, row.projectId)),
            },
        ];

        if (isApprovalEnabled) {
            actions.unshift({
                label: "PO Approval",
                icon: <CheckCircle className="h-4 w-4" />,
                onClick: (row) => setPoApproval(row),
            });
        }

        if (isAccountsSection) {
            actions.push({
                label: "Closure",
                icon: <Lock className="h-4 w-4" />,
                visible: (row) => row.poApproved === true,
                onClick: (row) => navigate(paths.accounts.poClosure(row.id)),
            });
        }

        return actions;
    }, [navigate, isAccountsSection]);

    const poColumns = useMemo<ColDef<PurchaseOrderRow>[]>(() => [
        {
            field: "poNumber",
            headerName: "PO Number",
            sortable: true,
            filter: true,
            width: 300,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>{getShortId(p.value)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "poDate",
            headerName: "PO Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => formatDate(p.value),
        },
        {
            field: "sellerName",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d.sellerName} ${d.sellerEmail || ""} ${d.sellerAddress || ""} ${d.sellerGstNo || ""} ${d.sellerPanNo || ""} ${d.sellerMsmeNo || ""} ${d.sellerCinNo || ""}`;
            },
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px]">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                                <p><strong>Email:</strong> {p.data?.sellerEmail || "—"}</p>
                                <p><strong>Address:</strong> {p.data?.sellerAddress || "—"}</p>
                                <p><strong>GST:</strong> {p.data?.sellerGstNo || "—"}</p>
                                <p><strong>PAN:</strong> {p.data?.sellerPanNo || "—"}</p>
                                <p><strong>MSME:</strong> {p.data?.sellerMsmeNo || "—"}</p>
                                <p><strong>CIN:</strong> {p.data?.sellerCinNo || "—"}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "shipToName",
            headerName: "Shipping",
            sortable: true,
            filter: true,
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d.shipToName} ${d.shippingAddress || ""} ${d.shipToGst || ""} ${d.shipToPan || ""}`;
            },
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px]">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                                <p><strong>Address:</strong> {p.data?.shippingAddress || "—"}</p>
                                <p><strong>GST:</strong> {p.data?.shipToGst || "—"}</p>
                                <p><strong>PAN:</strong> {p.data?.shipToPan || "—"}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "grandTotal",
            headerName: "PO Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => formatINR(p.value),
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d.grandTotal} ${d.totalAmount} ${d.totalGstAmt}`;
            },
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => {
                const d = p.data;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block">{formatINR(p.value)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs dark:bg-accent">
                                <div className="space-y-1 text-xs">
                                    <p><strong>Pre GST:</strong> {formatINR(d?.totalAmount || 0)}</p>
                                    <p><strong>GST:</strong> {formatINR(d?.totalGstAmt || 0)}</p>
                                    <p><strong>Grand Total:</strong> {formatINR(d?.grandTotal || 0)}</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "totalPaymentDone",
            headerName: "Payment Done",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => formatINR(p.value || 0),
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => {
                const d = p.data;
                const amountAfterTds = d?.amountAfterTds ? Number(d.amountAfterTds) : Number(d?.grandTotal || 0);
                const remaining = amountAfterTds - Number(d?.totalPaymentRequested || 0);

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block">{formatINR(p.value || 0)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs dark:bg-accent">
                                <div className="space-y-1 text-xs">
                                    <p><strong>Amount After TDS:</strong> {formatINR(amountAfterTds)}</p>
                                    <p><strong>Payment Requested:</strong> {formatINR(d?.totalPaymentRequested || 0)}</p>
                                    <p><strong>Maker Done:</strong> {formatINR(d?.totalMakerDone || 0)}</p>
                                    <p><strong>Payment Done:</strong> {formatINR(d?.totalPaymentDone || 0)}</p>
                                    <p><strong>Remaining:</strong> {formatINR(remaining)}</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "totalPiAmount",
            headerName: "Invoiced",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => formatINR(p.value || 0),
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => {
                const d = p.data;
                const totalAmount = Number(d?.amountAfterTds) || 0;
                const invoiceTotal = Number(d?.totalPiAmount) || 0;
                const remainingInvoice = totalAmount - invoiceTotal;

                const invoiceItems = d?.purchaseInvoices || [];
                const invoiceList = invoiceItems.map((inv, index) => {
                    const ordinal = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
                    return `${ordinal} invoice of ${formatINR(inv.totalAmount)}`;
                });

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block">{formatINR(p.value || 0)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs dark:bg-accent">
                                <div className="space-y-1 text-xs">
                                    {invoiceList.map((item, index) => (
                                        <p key={index}>{item}</p>
                                    ))}
                                    <p><strong>Total Invoiced:</strong> {formatINR(invoiceTotal)}</p>
                                    <p><strong>Remaining Invoice:</strong> {formatINR(remainingInvoice)}</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            headerName: "Progress",
            filter: false,
            sortable: false,
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => (
                p.data ? (
                    <OrderProgressCell
                        paid={Number(p.data.totalPaymentDone || 0)}
                        invoiced={Number(p.data.totalPiAmount || 0)}
                        paymentBase={Number(p.data.amountAfterTds || 0)}
                    />
                ) : null
            ),
            width: 130,
        },
        {
            field: "tdsPercentage",
            headerName: "TDS %",
            sortable: true,
            filter: true,
            width: 80,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => {
                const val = p.value;
                return val ? `${Number(val)}%` : "—";
            },
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => {
                const val = p.value;
                return (
                    <span className={val ? "" : "text-muted-foreground"}>
                        {val ? `${Number(val)}%` : "Not Set"}
                    </span>
                );
            },
        },
        {
            field: "poApproved",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => {
                const d = p.data;
                const isApproved = d?.poApproved === true;
                const isRejected = d?.poApproved === false;
                const tdsPct = d?.tdsPercentage ? Number(d.tdsPercentage) : null;

                let label: string;
                let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";

                if (isApproved) {
                    label = "Approved";
                    variant = "default";
                } else if (isRejected) {
                    label = "Rejected";
                    variant = "destructive";
                } else {
                    label = "Pending";
                    variant = "outline";
                }

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant={variant} className="gap-1 cursor-pointer">
                                    {label}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs dark:bg-accent">
                                <div className="space-y-1 text-xs">
                                    {tdsPct !== null && isApproved && (
                                        <>
                                            <p><strong>TDS:</strong> {tdsPct}% (-{formatINR(d?.tdsAmount || 0)})</p>
                                            <p><strong>After TDS:</strong> {formatINR(d?.amountAfterTds || 0)}</p>
                                        </>
                                    )}
                                    {d?.poApprovalRemark && (
                                        <p><strong>Remark:</strong> {d.poApprovalRemark}</p>
                                    )}
                                    {!d?.poApprovalRemark && !tdsPct && (
                                        <p className="text-muted-foreground">Awaiting approval</p>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "poRaisedBy",
            headerName: "PO Raised By",
            sortable: true,
            filter: true,
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<PurchaseOrderRow>(poActions),
            width: 80,
            pinned: "right" as "right" | "left",
        },
    ], [navigate, poActions]);

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                        Purchase Orders
                    </CardTitle>
                </div>
                <CardDescription>
                    {purchaseOrders.length} order{purchaseOrders.length !== 1 ? "s" : ""} found
                </CardDescription>
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
                <DataTable
                    data={purchaseOrders}
                    columnDefs={poColumns}
                    onGridReady={onGridReady}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 100,
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>

            {poApproval && (
                <SetTdsDialog
                    po={poApproval}
                    open={!!poApproval}
                    onClose={() => setPoApproval(null)}
                />
            )}
        </Card>
    );
};

export default PurchaseOrderListPage;
