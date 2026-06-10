import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectPurchaseInvoices } from "@/hooks/api/usePurchaseInvoices";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import type { PurchaseInvoiceRow } from "@/modules/operations/purchase-invoices/helpers/purchaseInvoice.types";
import type { ColDef, GridApi, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Edit, Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface PurchaseInvoicesSectionProps {
    projectId: number | null;
}

export const PurchaseInvoicesSection: React.FC<PurchaseInvoicesSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [piGridApi, setPiGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectPurchaseInvoices(projectId!);

    const purchaseInvoices = data ?? [];

    const piActions: ActionItem<PurchaseInvoiceRow>[] = useMemo(() => [
        {
            label: "Edit Invoice",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editPurchaseInvoicePage(row.id, projectId!)),
        },
    ], [navigate, projectId]);

    const piColumns = useMemo<ColDef<PurchaseInvoiceRow>[]>(() => [
        {
            field: "invoiceNo",
            headerName: "Invoice No",
            sortable: true,
            filter: true,
            width: 250,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<PurchaseInvoiceRow>) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "category",
            headerName: "Category",
            sortable: true,
            filter: true,
            width: 130,
        },
        {
            field: "partyName",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
        },
        {
            field: "valuePreGst",
            headerName: "Value (Pre GST)",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseInvoiceRow>) => formatINR(p.value),
        },
        {
            field: "gstAmount",
            headerName: "GST Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseInvoiceRow>) => formatINR(p.value),
        },
        {
            field: "invoiceDate",
            headerName: "Invoice Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: ValueFormatterParams<PurchaseInvoiceRow>) => formatDate(p.value),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<PurchaseInvoiceRow>(piActions),
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
                            Purchase Invoices
                        </CardTitle>
                        <CardAction>
                            <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raisePurchaseInvoiceForm(projectId))}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                New PI
                            </Button>
                        </CardAction>
                    </div>
                    <CardDescription>
                        {purchaseInvoices.length} invoice{purchaseInvoices.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={purchaseInvoices}
                    columnDefs={piColumns}
                    onGridReady={(params) => setPiGridApi(params.api)}
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
