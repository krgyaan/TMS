import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Eye, History, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { useAllVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import type { VendorWorkOrderRow } from "./helpers/vwoForm.types";

const VendorWorkOrderListPage: React.FC = () => {
    const navigate = useNavigate();
    const { data } = useAllVendorWorkOrders();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    const workOrders = data ?? [];

    const onGridReady = useCallback((event: GridReadyEvent<VendorWorkOrderRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const woActions: ActionItem<VendorWorkOrderRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editVendorWoPage(row.id, row.projectId)),
        },
        {
            label: "PDF Versions",
            icon: <History className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.vendorWoPdfVersions(row.id, row.projectId)),
        },
    ], [navigate]);

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
                            <span>{p.value || "-"}</span>
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
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block">{formatINR(p.value)}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                            <div className="space-y-1 text-xs">
                                <p><strong>Total:</strong> {formatINR(p.data?.totalAmount || 0)}</p>
                                <p><strong>GST:</strong> {formatINR(p.data?.totalGstAmt || 0)}</p>
                                <p><strong>Grand Total:</strong> {formatINR(p.data?.grandTotal || 0)}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
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
    ], [navigate]);

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
                <DataTable
                    data={workOrders}
                    columnDefs={woColumns}
                    onGridReady={onGridReady}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 10,
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>
        </Card>
    );
};

export default VendorWorkOrderListPage;
