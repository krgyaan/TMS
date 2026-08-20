import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectInsurancePolicies } from "@/hooks/api/useProjectInsurance";
import { formatINR } from "@/hooks/useINRFormatter";
import type { InsurancePolicyRow } from "@/modules/insurance/helpers/insurance.types";
import { format } from "date-fns";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Eye, Plus } from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Active: "default",
    "Expiring Soon": "secondary",
    Expired: "destructive",
};

interface InsuranceSectionProps {
    projectId: number | null;
}

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ projectId }) => {
    const navigate = useNavigate();

    const { data, isLoading } = useProjectInsurancePolicies(projectId ?? 0);

    const policies = data ?? [];

    const insuranceActions: ActionItem<InsurancePolicyRow>[] = useMemo(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.accounts.insuranceView(row.id)),
        },
    ], [navigate]);

    const insuranceColumns = useMemo<ColDef<InsurancePolicyRow>[]>(() => [
        {
            field: "insuranceType",
            headerName: "Insurance Type",
            sortable: true,
            filter: true,
            width: 130,
            cellRenderer: (p: CustomCellRendererProps<InsurancePolicyRow>) => (
                <Badge variant="outline" className="h-5 px-2">
                    {p.value ?? "—"}
                </Badge>
            ),
        },
        {
            field: "policyNumber",
            headerName: "Policy Number",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 140,
            valueGetter: (params) => params.data?.policyNumber ?? "—",
        },
        {
            field: "insurerName",
            headerName: "Insurer Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 140,
            valueGetter: (params) => params.data?.insurerName ?? "—",
        },
        {
            field: "startDate",
            headerName: "Start Date",
            sortable: true,
            width: 120,
            valueFormatter: (p) => (p.value ? format(new Date(p.value), "dd-MM-yyyy") : "—"),
        },
        {
            field: "endDate",
            headerName: "End Date",
            sortable: true,
            width: 120,
            valueFormatter: (p) => (p.value ? format(new Date(p.value), "dd-MM-yyyy") : "—"),
        },
        {
            field: "sumAssured",
            headerName: "Sum Assured",
            sortable: true,
            width: 130,
            valueFormatter: (p) => formatINR(p.value),
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 130,
            cellRenderer: (p: CustomCellRendererProps<InsurancePolicyRow>) => (
                <Badge variant={STATUS_BADGE_VARIANT[p.value ?? "Expired"] ?? "outline"} className="h-5 px-2">
                    {p.value ?? "—"}
                </Badge>
            ),
        },
        {
            field: "linkedRequest",
            headerName: "Linked Request",
            sortable: true,
            filter: true,
            width: 170,
            valueGetter: (params) => params.data?.linkedRequest ?? "—",
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<InsurancePolicyRow>(insuranceActions),
            width: 80,
            pinned: "right" as "right" | "left",
        },
    ], [insuranceActions]);

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
                                Insurance
                            </CardTitle>
                            <CardAction>
                                <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raiseProjectInsuranceForm(projectId))}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Add Insurance
                                </Button>
                            </CardAction>
                        </div>
                        <CardDescription>
                            {policies.length} polic{policies.length !== 1 ? "ies" : "y"} found — adding insurance raises a project payment request automatically
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <DataTable
                        data={policies}
                        columnDefs={insuranceColumns}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 10,
                            domLayout: "autoHeight",
                        }}
                    />
                </CardContent>
            </Card>
    );
};