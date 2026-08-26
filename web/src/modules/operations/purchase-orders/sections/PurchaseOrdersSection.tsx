import React, { useMemo, useState } from "react";
import { Edit, Eye, FileText, History, Plus, ShieldAlert } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
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
import { useHasWCInsurance } from "@/hooks/api/useProjectInsurance";
import { Button } from "@/components/ui/button";
import type { PurchaseOrderRow } from "../helpers/purchaseOrder.types";
import { OrderProgressCell } from "@/components/OrderProgressCell";

interface PurchaseOrdersSectionProps {
    projectId: number | null;
}

export const PurchaseOrdersSection: React.FC<PurchaseOrdersSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [poGridApi, setPoGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectPurchaseOrders(projectId!);
    const { hasWC } = useHasWCInsurance(projectId ?? 0);

    const purchaseOrders = data?.purchaseOrders ?? [];

    const poActions: ActionItem<PurchaseOrderRow>[] = useMemo(() => [
        {
            label: "Raise Payment",
            visible: (row) => row.poApproved === true
                && Number(row.totalPaymentRequested || 0) < Number(row.amountAfterTds ?? row.grandTotal),
            onClick: (row) => navigate(paths.operations.raiseProjectPaymentRequestForm(projectId!, row.id)),
        },
        {
            label: "Upload Invoice",
            icon: <FileText className="h-4 w-4" />,
            visible: (row) => Number(row.totalPiAmount || 0) < Number(row.grandTotal || 0),
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
            headerName: "PO Amount",
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
                                <p><strong>Pre GST:</strong> {formatINR(p.data?.totalAmount || 0)}</p>
                                <p><strong>GST:</strong> {formatINR(p.data?.totalGstAmt || 0)}</p>
                                <p><strong>Grand Total:</strong> {formatINR(p.data?.grandTotal || 0)}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
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
                const totalAmount = d?.amountAfterTds || 0;
                const invoiceTotal = d?.totalPiAmount || 0;
                const remainingInvoice = Number(totalAmount) - invoiceTotal;

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
            field: "poRaisedBy",
            headerName: "PO Raised By",
            sortable: true,
            filter: true,
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
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                disabled={!hasWC}
                                                onClick={() => navigate(paths.operations.raisePoForm(projectId))}
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                Raise Purchase Order
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
