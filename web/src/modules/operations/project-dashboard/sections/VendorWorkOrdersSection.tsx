import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import { useHasWCInsurance } from "@/hooks/api/useProjectInsurance";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { getShortId } from "@/lib/id-utils";
import type { VendorWorkOrderRow } from "@/modules/operations/vendor-work-orders/helpers/vwoForm.types";
import { OrderProgressCell } from "@/components/OrderProgressCell";
import type { ColDef, GridApi, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Edit, Eye, FileUp, History, Plus, ShieldAlert } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface VendorWorkOrdersSectionProps {
    projectId: number | null;
}

export const VendorWorkOrdersSection: React.FC<VendorWorkOrdersSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [vwoGridApi, setVwoGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectVendorWorkOrders(projectId!);
    const { hasWC } = useHasWCInsurance(projectId ?? 0);

    const vendorWorkOrders = data ?? [];

    const vwoActions: ActionItem<VendorWorkOrderRow>[] = useMemo(() => [
        {
            label: "Raise Payment",
            visible: (row) => row.woApproved === true
                && Number(row.totalPaymentRequested || 0) < Number(row.amountAfterTds ?? row.grandTotal),
            onClick: (row) => navigate(paths.operations.raiseProjectPaymentRequestForm(projectId!, undefined, row.id)),
        },
        {
            label: "Upload Invoice",
            icon: <FileUp className="h-4 w-4" />,
            visible: (row) => Number(row.totalVwiAmount || 0) < Number(row.grandTotal || 0),
            onClick: (row) => navigate(paths.operations.raiseVendorWoInvoiceForm(projectId!, row.id)),
        },
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.viewVendorWoPage(row.id, projectId!)),
        },
        {
            label: "Edit WO",
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.woApproved !== true,
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
            field: "totalVwiAmount",
            headerName: "Invoiced",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<VendorWorkOrderRow>) => formatINR(p.value || 0),
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
            field: "woRaisedBy",
            headerName: "Raised By",
            sortable: true,
            filter: true,
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
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                disabled={!hasWC}
                                                onClick={() => navigate(paths.operations.raiseVendorWoForm(projectId))}
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                Raise Work Order
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {!hasWC && (
                                        <TooltipContent>
                                            <div className="flex items-center gap-1.5">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                WC insurance policy required
                                            </div>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
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
