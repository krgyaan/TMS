import React, { useMemo, useState } from "react";
import { Download, Edit, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { GridApi } from "ag-grid-community";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";

interface PurchaseOrdersSectionProps {
    purchaseOrders: any[];
}

export const PurchaseOrdersSection: React.FC<PurchaseOrdersSectionProps> = ({
    purchaseOrders,
}) => {
    const navigate = useNavigate();
    const [poGridApi, setPoGridApi] = useState<GridApi | null>(null);

    const poActions: ActionItem<any>[] = useMemo(() => [
        {
            label: "Raise Payment",
            onClick: (row) => console.log("Raise payment for", row.id),
        },
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.viewPoPage(row.id)),
        },
        {
            label: "Edit PO",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editPoPage(row.id)),
        },
        {
            label: "Download PO",
            icon: <Download className="h-4 w-4" />,
            onClick: (row) => console.log("Download PO", row.id),
        },
    ], [navigate]);

    const poColumns = useMemo(() => [
        {
            field: "poNumber",
            headerName: "PO Number",
            sortable: true,
            filter: true,
            cellRenderer: (p: any) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "createdAt",
            headerName: "Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "sellerName",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
            cellRenderer: (p: any) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px]">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatINR(p.value),
            cellClass: "tabular-nums font-medium",
        },
        {
            field: "amountPaid",
            headerName: "Amount Paid",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatINR(p.value),
            cellClass: "tabular-nums",
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<any>(poActions),
            width: 80,
            pinned: "right",
        },
    ], [navigate]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="text-base font-semibold">
                        Purchase Orders
                    </CardTitle>
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
                        paginationPageSize: 5,
                        domLayout: 'autoHeight',
                    }}
                />
            </CardContent>
        </Card>
    );
};
