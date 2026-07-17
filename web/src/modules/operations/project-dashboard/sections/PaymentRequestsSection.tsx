import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectPaymentRequests } from "@/hooks/api/useProjectPaymentRequests";
import { formatINR } from "@/hooks/useINRFormatter";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import { PAYMENT_AGAINST_LABELS, PaymentRequestDetailDialog } from "@/modules/shared/payment-requests/components/PaymentRequestDetailDialog";
import type { ColDef, GridApi, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Edit, Eye, Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface PaymentRequestsSectionProps {
    projectId: number | null;
}

export const PaymentRequestsSection: React.FC<PaymentRequestsSectionProps> = ({
    projectId,
}) => {
    const navigate = useNavigate();
    const [prGridApi, setPrGridApi] = useState<GridApi | null>(null);
    const { data, isLoading } = useProjectPaymentRequests(projectId!);

    const paymentRequests = data ?? [];

    const [viewingId, setViewingId] = useState<number | null>(null);

    const handleView = useMemo(() => (row: PaymentRequestRow) => setViewingId(row.id), []);

    const prActions: ActionItem<PaymentRequestRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: handleView,
        },
        {
            label: "Edit Request",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editProjectPaymentRequestPage(row.id, projectId!)),
        },
    ], [navigate, projectId, handleView]);

    const prColumns = useMemo<ColDef<PaymentRequestRow>[]>(() => [
        {
            field: "requestNo",
            headerName: "Request No",
            sortable: true,
            filter: true,
            width: 250,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
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
            field: "amount",
            headerName: "Amount",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) => formatINR(p.value),
        },
        {
            field: "paymentAgainst",
            headerName: "Payment Against",
            sortable: true,
            filter: true,
            width: 140,
            valueFormatter: (p: ValueFormatterParams<PaymentRequestRow>) =>
                PAYMENT_AGAINST_LABELS[p.value] || p.value || "-",
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: CustomCellRendererProps<PaymentRequestRow>) => {
                const status = p.value || "pending";
                const colors: Record<string, string> = {
                    pending: "text-yellow-600 bg-yellow-50",
                    approved: "text-green-600 bg-green-50",
                    rejected: "text-red-600 bg-red-50",
                };
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || ""}`}>
                        {status}
                    </span>
                );
            },
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<PaymentRequestRow>(prActions),
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
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="w-full">
                        <div className="flex justify-between items-center gap-2">
                            <CardTitle className="text-base font-semibold">
                                Payment Requests
                            </CardTitle>
                            <CardAction>
                                <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raiseProjectPaymentRequestForm(projectId))}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Request for Payment
                                </Button>
                            </CardAction>
                        </div>
                        <CardDescription>
                            {paymentRequests.length} request{paymentRequests.length !== 1 ? 's' : ''} found
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <DataTable
                        data={paymentRequests}
                        columnDefs={prColumns}
                        onGridReady={(params) => setPrGridApi(params.api)}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 10,
                            domLayout: 'autoHeight',
                        }}
                    />
                </CardContent>
            </Card>

            <PaymentRequestDetailDialog
                viewingId={viewingId}
                onClose={() => setViewingId(null)}
            />
        </>
    );
};
