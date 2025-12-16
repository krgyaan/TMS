import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { Trash, ArrowLeft } from "lucide-react";

import { useImprestPaymentHistory, useDeleteImprestPaymentHistory } from "./imprest-admin.hooks";
import type { ColDef } from "ag-grid-community";

/** INR formatter */
const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

const ImprestPaymentHistory: React.FC = () => {
    const navigate = useNavigate();
    const { userId } = useParams<{ userId: string }>();
    console.log("User ID from params:", userId);

    const { data = [], isLoading } = useImprestPaymentHistory(Number(userId));
    const deleteMutation = useDeleteImprestPaymentHistory();

    const columns: ColDef[] = useMemo(
        () => [
            {
                headerName: "Date",
                field: "date",
                valueFormatter: p => new Date(p.value).toLocaleDateString("en-GB"),
            },
            { headerName: "Name", field: "teamMemberName" },
            {
                headerName: "Amount",
                field: "amount",
                valueFormatter: p => formatINR(p.value),
            },
            { headerName: "Project Name", field: "projectName" },
            {
                headerName: "Action",
                cellRenderer: p => (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            if (confirm("Delete this transaction?")) {
                                deleteMutation.mutate(p.data.id);
                            }
                        }}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                ),
            },
        ],
        [deleteMutation]
    );

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <CardTitle>Imprest Payment History</CardTitle>
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
