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
import type { VendorWorkOrderRow } from "./helpers/vwoForm.types";
import { SetVwoApprovalDialog } from "./components/SetVwoApprovalDialog";
import { OrderProgressCell } from "@/components/OrderProgressCell";

interface VendorWorkOrderListPageProps {
    workOrders?: VendorWorkOrderRow[];
    showApprovalAction?: boolean;
    search?: string;
    onSearchChange?: (value: string) => void;
}

const VendorWorkOrderListPage: React.FC<VendorWorkOrderListPageProps> = ({
    workOrders: propWorkOrders,
    showApprovalAction,
    search: propSearch,
    onSearchChange: propOnSearchChange,
}) => {
    const navigate = useNavigate();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [internalSearch, setInternalSearch] = useState("");
    const search = propSearch !== undefined ? propSearch : internalSearch;
    const setSearch = propOnSearchChange ?? setInternalSearch;
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [vwoApproval, setVwoApproval] = useState<VendorWorkOrderRow | null>(null);

    const isApprovalEnabled = showApprovalAction ?? false;
    const location = useLocation();
    const isAccountsSection = location.pathname.includes("/accounts/");

    const workOrders = propWorkOrders ?? [];

    const onGridReady = useCallback((event: GridReadyEvent<VendorWorkOrderRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const woActions: ActionItem<VendorWorkOrderRow>[] = useMemo(() => {
        const actions: ActionItem<VendorWorkOrderRow>[] = [
            {
                label: "Upload Invoice",
                icon: <FileUp className="h-4 w-4" />,
                visible: (row) => Number(row.totalVwiAmount || 0) < Number(row.grandTotal || 0),
                onClick: (row) => navigate(paths.operations.raiseVendorWoInvoiceForm(row.projectId, row.id)),
            },
            {
                label: "View Details",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row) => navigate(paths.operations.viewVendorWoPage(row.id, row.projectId)),
            },
            {
                label: "PDF Versions",
                icon: <History className="h-4 w-4" />,
                onClick: (row) => navigate(paths.operations.vendorWoPdfVersions(row.id, row.projectId)),
            },
        ];

        if (isApprovalEnabled) {
            actions.unshift({
                label: "VWO Approval",
                icon: <CheckCircle className="h-4 w-4" />,
                onClick: (row) => setVwoApproval(row),
            });
        }

        if (isAccountsSection) {
            actions.push({
                label: "Closure",
                icon: <Lock className="h-4 w-4" />,
                visible: (row) => row.woApproved === true,
                onClick: (row) => navigate(paths.accounts.vwoClosure(row.id)),
            });
        }

        return actions;
    }, [navigate, isApprovalEnabled, isAccountsSection]);

    const woColumns = useMemo<ColDef<VendorWorkOrderRow>[]>(() => [
        {
            field: "woNumber",
            headerName: "WO Number",
            sortable: true,
            filter: true,
            width: 300,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => (
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
            field: "woDate",
            headerName: "WO Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: ValueFormatterParams<VendorWorkOrderRow>) => formatDate(p.value),
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
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => (
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
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => (
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
            headerName: "Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<VendorWorkOrderRow>) => formatINR(p.value),
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d.grandTotal} ${d.totalAmount} ${d.totalGstAmt}`;
            },
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => {
                const d = p.data;
                const tdsPct = d?.tdsPercentage ? Number(d.tdsPercentage) : null;

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block">{formatINR(p.value)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs dark:bg-accent">
                                <div className="space-y-1 text-xs">
                                    <p><strong>Total (Pre-GST):</strong> {formatINR(d?.totalAmount || 0)}</p>
                                    <p><strong>GST Amount:</strong> {formatINR(d?.totalGstAmt || 0)}</p>
                                    <p><strong>Grand Total:</strong> {formatINR(d?.grandTotal || 0)}</p>
                                    {tdsPct !== null && (
                                        <>
                                            <div className="border-t my-1.5" />
                                            <p className="text-destructive">
                                                <strong>TDS @ {tdsPct}%:</strong> -{formatINR(d?.tdsAmount || 0)}
                                            </p>
                                            <p className="font-semibold">
                                                <strong>After TDS:</strong> {formatINR(d?.amountAfterTds || 0)}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "totalVwiAmount",
            headerName: "Invoiced",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<VendorWorkOrderRow>) => formatINR(p.value || 0),
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d?.totalVwiAmount || 0} ${d?.totalVwiCount || 0}`;
            },
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => {
                const d = p.data;
                const invoiceTotal = d?.totalVwiAmount || 0;
                const remainingInvoice = (d?.grandTotal || 0) - invoiceTotal;
                const invoiceCount = d?.totalVwiCount || 0;

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block">{formatINR(p.value || 0)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs dark:bg-accent">
                                <div className="space-y-1 text-xs">
                                    <p><strong>Invoices Uploaded:</strong> {invoiceCount}</p>
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
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => (
                p.data ? (
                    <OrderProgressCell
                        paid={Number(p.data.totalPaymentDone || 0)}
                        invoiced={Number(p.data.totalVwiAmount || 0)}
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
            valueFormatter: (p: ValueFormatterParams<VendorWorkOrderRow>) => {
                const val = p.value;
                return val ? `${Number(val)}%` : "—";
            },
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => {
                const val = p.value;
                return (
                    <span className={val ? "" : "text-muted-foreground"}>
                        {val ? `${Number(val)}%` : "Not Set"}
                    </span>
                );
            },
        },
        {
            field: "woApproved",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => {
                const d = p.data;
                const isApproved = d?.woApproved === true;
                const isRejected = d?.woApproved === false;
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
                                    {d?.woApprovalRemark && (
                                        <p><strong>Remark:</strong> {d.woApprovalRemark}</p>
                                    )}
                                    {!d?.woApprovalRemark && !tdsPct && (
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
            field: "woRaisedBy",
            headerName: "Raised By",
            sortable: true,
            filter: true,
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<VendorWorkOrderRow>(woActions),
            width: 80,
            pinned: "right" as "right" | "left",
        },
    ], [navigate, woActions]);

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                        Vendor Work Orders
                    </CardTitle>
                </div>
                <CardDescription>
                    {workOrders.length} order{workOrders.length !== 1 ? "s" : ""} found
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex justify-end">
                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by WO number, vendor name, GST…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                <DataTable
                    data={workOrders}
                    columnDefs={woColumns}
                    onGridReady={onGridReady}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 100,
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>

            {vwoApproval && (
                <SetVwoApprovalDialog
                    vwo={vwoApproval}
                    open={!!vwoApproval}
                    onClose={() => setVwoApproval(null)}
                />
            )}
        </Card>
    );
};

export default VendorWorkOrderListPage;