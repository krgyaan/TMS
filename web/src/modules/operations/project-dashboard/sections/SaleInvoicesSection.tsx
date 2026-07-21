import React, { useMemo, useState } from "react";
import { Plus, Eye } from "lucide-react";
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
import { useProjectSaleInvoices } from "@/hooks/api/useSaleInvoices";
import { Button } from "@/components/ui/button";
import type { SaleInvoiceRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";

interface SaleInvoicesSectionProps {
    projectId: number | null;
}

export const SaleInvoicesSection: React.FC<SaleInvoicesSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [siGridApi, setSiGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectSaleInvoices(projectId!);

    const saleInvoices = data?.saleInvoices ?? [];

    const siActions: ActionItem<SaleInvoiceRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => {},
        },
    ], []);

    const statusBadgeClass = (status: string) => {
        switch (status) {
            case "oe_request": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
            case "invoiced": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            case "credit_note": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
            case "payment_received": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
            case "completed": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
        }
    };

    const siColumns = useMemo<ColDef<SaleInvoiceRow>[]>(() => [
        {
            field: "invoiceNumber",
            headerName: "Invoice Number",
            sortable: true,
            filter: true,
            width: 250,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<SaleInvoiceRow>) => (
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
            field: "invoiceDate",
            headerName: "Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: ValueFormatterParams<SaleInvoiceRow>) => formatDate(p.value),
        },
        {
            field: "billingCustomerName",
            headerName: "Customer",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
        },
        {
            field: "grandTotal",
            headerName: "Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<SaleInvoiceRow>) => formatINR(p.value || 0),
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            cellRenderer: (p: CustomCellRendererProps<SaleInvoiceRow>) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(p.value)}`}>
                    {p.value?.replace(/_/g, " ").toUpperCase() || "DRAFT"}
                </span>
            ),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<SaleInvoiceRow>(siActions),
            width: 80,
            pinned: "right" as "right" | "left",
        },
    ], []);

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
                            Sale Invoices
                        </CardTitle>
                        <CardAction>
                            <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raiseSaleInvoiceForm(projectId))}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Raise Sale Invoice
                            </Button>
                        </CardAction>
                    </div>
                    <CardDescription>
                        {saleInvoices.length} invoice{saleInvoices.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={saleInvoices}
                    columnDefs={siColumns}
                    onGridReady={(params) => setSiGridApi(params.api)}
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
