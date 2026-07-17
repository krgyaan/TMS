import React, { useMemo, useState } from "react";
import { Edit, Eye, History, Plus } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColDef, GridApi, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { getShortId } from "@/lib/id-utils";
import { useProjectVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import { Button } from "@/components/ui/button";
import type { VendorWorkOrderRow } from "@/modules/operations/vendor-work-orders/helpers/vwoForm.types";

interface VendorWorkOrdersSectionProps {
    projectId: number | null;
}

export const VendorWorkOrdersSection: React.FC<VendorWorkOrdersSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [vwoGridApi, setVwoGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectVendorWorkOrders(projectId!);

    const vendorWorkOrders = data ?? [];

    const vwoActions: ActionItem<VendorWorkOrderRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editVendorWoPage(row.id, projectId!)),
        },
        {
            label: "Edit WO",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editVendorWoPage(row.id, projectId!)),
        },
        {
            label: "PDF Versions",
            icon: <History className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.vendorWoPdfVersions(row.id, projectId!)),
        },
    ], [navigate, projectId]);

    const vwoColumns = useMemo<ColDef<VendorWorkOrderRow>[]>(() => [
        {
            field: "woNumber",
            headerName: "WO Number",
            sortable: true,
            filter: true,
            width: 250,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<VendorWorkOrderRow>) => (
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
            cellRenderer: createActionColumnRenderer<VendorWorkOrderRow>(vwoActions),
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="w-full">
                    <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                            Vendor Work Orders
                        </CardTitle>
                        <CardAction>
                            <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raiseVendorWoForm(projectId))}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Raise Work Order
                            </Button>
                        </CardAction>
                    </div>
                    <CardDescription>
                        {vendorWorkOrders.length} order{vendorWorkOrders.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={vendorWorkOrders}
                    columnDefs={vwoColumns}
                    onGridReady={(params) => setVwoGridApi(params.api)}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 10,
                        domLayout: 'autoHeight',
                    }}
                />
            </CardContent>
        </Card>
    );
};
