import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { ArrowLeft, Loader2, Trash } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDeleteImprestPaymentHistory, useImprestPaymentHistory } from "@/hooks/api/imprest.hooks";
import { useAuth } from "@/contexts/AuthContext";
import type { ImprestPaymentHistoryRow } from "./helpers/imprest.types";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";

const ImprestPaymentHistory: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { canDelete } = useAuth();
    const canDeletePayment = canDelete("accounts.imprests");
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? Number(userIdParam) : undefined;
    const { data = [], isLoading, error } = useImprestPaymentHistory(userId);
    const deleteMutation = useDeleteImprestPaymentHistory();
    
    const handleDelete = useCallback(
        (row: ImprestPaymentHistoryRow) => {
            if (!confirm("Delete this transaction?")) return;
            deleteMutation.mutate(row.id);
        },
        [deleteMutation]
    );

    const columns: ColDef<ImprestPaymentHistoryRow>[] = useMemo(() => {
        const baseColumns: ColDef<ImprestPaymentHistoryRow>[] = [
            {
                headerName: "Date",
                field: "date",
                width: 140,
                valueFormatter: p => (p.value ? formatDate(p.value) : "-"),
            },
            {
                headerName: "Name",
                field: "teamMemberName",
                width: 180,
            },
            {
                headerName: "Amount",
                field: "amount",
                width: 140,
                valueFormatter: p => formatINR(p.value ?? 0),
            },
            {
                headerName: "Project Name",
                field: "projectName",
                width: 220,
            },
        ];

        if (canDeletePayment) {
            baseColumns.push({
                headerName: "Action",
                width: 120,
                sortable: false,
                filter: false,
                cellRenderer: (p: { data: ImprestPaymentHistoryRow }) => (
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.data)} disabled={deleteMutation.isPending}>
                        <Trash className="h-4 w-4" />
                    </Button>
                ),
            });
        }

        return baseColumns;
    }, [handleDelete, deleteMutation.isPending, canDeletePayment]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading payment history…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600">Failed to load payment history</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle>Imprest Payment History</CardTitle>
                    <CardDescription>
                        {data.length} record{data.length !== 1 ? "s" : ""} found
                    </CardDescription>
                </div>

                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
            </CardHeader>

            <CardContent>
                <DataTable data={data} loading={isLoading} columnDefs={columns} gridOptions={{ pagination: true }} />
            </CardContent>
        </Card>
    );
};

export default ImprestPaymentHistory;
