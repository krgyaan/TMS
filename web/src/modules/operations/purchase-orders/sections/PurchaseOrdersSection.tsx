import React, { useMemo, useState } from "react";
import { Edit, Eye, FileText, History, Plus } from "lucide-react";
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
import { useProjectPurchaseOrders } from "@/hooks/api/usePurchaseOrders";
import { Button } from "@/components/ui/button";
import type { PurchaseOrderRow } from "../helpers/purchaseOrder.types";

interface PurchaseOrdersSectionProps {
    projectId: number | null;
}

export const PurchaseOrdersSection: React.FC<PurchaseOrdersSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [poGridApi, setPoGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectPurchaseOrders(projectId!);

    const purchaseOrders = data?.purchaseOrders ?? [];

    const poActions: ActionItem<PurchaseOrderRow>[] = useMemo(() => [
        {
            label: "Raise Payment",
            onClick: (row) => navigate(paths.operations.raiseProjectPaymentRequestForm(projectId!, row.id)),
        },
        {
            label: "Upload Invoice",
            icon: <FileText className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.raiseProjectPurchaseInvoiceForm(projectId!, row.id)),
        },
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.viewPoPage(row.id, projectId!)),
        },
        {
            label: "Edit PO",
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.poApproved !== true,
            onClick: (row) => navigate(paths.operations.editPoPage(row.id, projectId!)),
        },
        {
            label: "PDF Versions",
            icon: <History className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.poPdfVersions(row.id, projectId!)),
        },
    ], [navigate, projectId]);

    const poColumns = useMemo<ColDef<PurchaseOrderRow>[]>(() => [
        {
            field: "poNumber",
            headerName: "PO Number",
            sortable: true,
            filter: true,
            width: 250,
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
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => (
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
            field: "totalPiAmount",
            headerName: "Invoiced",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseOrderRow>) => formatINR(p.value || 0),
            cellRenderer: (p: CustomCellRendererProps<PurchaseOrderRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block">{formatINR(p.value || 0)}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                            <p className="text-xs">{p.data?.totalPiCount || 0} invoice(s)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            headerName: "Bal to Inv",
            sortable: false,
            valueGetter: (p: any) => {
                const po = p.data as PurchaseOrderRow;
                const cap = po.amountAfterTds ? Number(po.amountAfterTds) : Number(po.grandTotal || 0);
                return cap - Number(po.totalPiAmount || 0);
            },
            valueFormatter: (p: ValueFormatterParams) => formatINR(p.value),
            cellStyle: (p: any) => p.value <= 0 ? { color: "var(--color-destructive)" } : undefined,
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
                            Purchase Orders
                        </CardTitle>
                        <CardAction>
                            <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raisePoForm(projectId))}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Raise Purchase Order
                            </Button>
                        </CardAction>
                    </div>
                    <CardDescription>
                        {purchaseOrders.length} order{purchaseOrders.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={purchaseOrders}
                    columnDefs={poColumns}
                    onGridReady={(params) => setPoGridApi(params.api)}
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
