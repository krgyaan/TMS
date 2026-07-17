import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Eye, History, Percent, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useNavigate, useLocation } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { useAllPurchaseOrders } from "@/hooks/api/useProjectDashboard";
import type { PurchaseOrderRow } from "@/modules/operations/project-dashboard/helpers/projectDashboard.types";
import { SetTdsDialog } from "./components/SetTdsDialog";

const PurchaseOrderListPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { data } = useAllPurchaseOrders();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [selectedPoForTds, setSelectedPoForTds] = useState<PurchaseOrderRow | null>(null);

    const isAccountsSection = location.pathname.includes("/accounts/");

    const purchaseOrders = data?.purchaseOrders ?? [];

    const onGridReady = useCallback((event: GridReadyEvent<PurchaseOrderRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const poActions: ActionItem<PurchaseOrderRow>[] = useMemo(() => {
        const actions: ActionItem<PurchaseOrderRow>[] = [
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

        if (isAccountsSection) {
            actions.unshift({
                label: "Set TDS %",
                icon: <Percent className="h-4 w-4" />,
                onClick: (row) => setSelectedPoForTds(row),
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
                            <span>{p.value || "-"}</span>
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
            headerName: "Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => formatINR(p.value),
            getQuickFilterText: (params) => {
                const d = params.data;
                return `${d.grandTotal} ${d.totalAmount} ${d.totalGstAmt}`;
            },
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => {
                const d = p.data;
                const remaining = d?.amountAfterTds
                    ? Number(d.amountAfterTds) - Number(d.totalPaymentRequested ?? 0)
                    : null;
                const tdsPct = d?.tdsPercentage ? Number(d.tdsPercentage) : null;

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block">{formatINR(p.value)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-xs">
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
                                            <div className="border-t my-1.5" />
                                            <p><strong>Payment Requested:</strong> {formatINR(d?.totalPaymentRequested || 0)}</p>
                                            <p className="pl-2 text-muted-foreground">
                                                Maker Done: {formatINR(d?.totalMakerDone || 0)}
                                            </p>
                                            <p className="pl-2 text-muted-foreground">
                                                Payment Done: {formatINR(d?.totalPaymentDone || 0)}
                                            </p>
                                            <p className={remaining !== null && remaining < 0 ? "text-destructive font-semibold" : "font-semibold"}>
                                                <strong>Remaining:</strong> {formatINR(remaining ?? 0)}
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

            {selectedPoForTds && (
                <SetTdsDialog
                    po={selectedPoForTds}
                    open={!!selectedPoForTds}
                    onClose={() => setSelectedPoForTds(null)}
                />
            )}
        </Card>
    );
};

export default PurchaseOrderListPage;
