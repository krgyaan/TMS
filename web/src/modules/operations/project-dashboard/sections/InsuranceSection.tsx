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
import { formatDate } from "@/hooks/useFormatedDate";
import type { InsurancePolicyRow } from "@/modules/insurance/helpers/insurance.types";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Eye, Plus, RefreshCcw } from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    CATEGORY_NAMES,
    PROJECT_INSURANCE_CATEGORIES,
    TOTAL_CATEGORIES,
    type InsuranceChecklistRow,
} from "../helpers/projectInsurance.types";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
    Active: "success",
    "Expiring Soon": "secondary",
    Expired: "destructive",
    Pending: "outline",
};

interface InsuranceSectionProps {
    projectId: number | null;
}

function getLatestPolicy(row: InsuranceChecklistRow): InsurancePolicyRow | null {
    if (row.policies.length === 0) return null;
    return row.policies.reduce((latest, p) =>
        new Date(p.createdAt) > new Date(latest.createdAt) ? p : latest
    );
}

function getRowStatus(row: InsuranceChecklistRow): string {
    if (row.policies.length === 0) return "Pending";
    const latest = getLatestPolicy(row);
    return latest?.status ?? "Pending";
}

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ projectId }) => {
    const navigate = useNavigate();

    const { data, isLoading } = useProjectInsurancePolicies(projectId ?? 0);

    const policies = useMemo(() => data ?? [], [data]);

    const checklistRows = useMemo<InsuranceChecklistRow[]>(() =>
        CATEGORY_NAMES.map(categoryName => ({
            categoryName,
            types: PROJECT_INSURANCE_CATEGORIES[categoryName],
            policies: policies.filter(p =>
                PROJECT_INSURANCE_CATEGORIES[categoryName].includes(p.insuranceType)
            ),
        })),
    [policies]);

    const coveredCount = useMemo(
        () => checklistRows.filter(r => r.policies.length > 0).length,
        [checklistRows]
    );

    const insuranceActions: ActionItem<InsuranceChecklistRow>[] = useMemo(() => [
        {
            label: "Add Insurance",
            icon: <Plus className="h-4 w-4" />,
            onClick: (row: InsuranceChecklistRow) => {
                const path = row.types.length === 1
                    ? `${paths.operations.raiseProjectInsuranceForm(projectId!)}?type=${row.types[0]}`
                    : paths.operations.raiseProjectInsuranceForm(projectId!);
                navigate(path);
            },
            hidden: (row: InsuranceChecklistRow) => row.policies.length > 0,
        },
        {
            label: "View Policy",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row: InsuranceChecklistRow) => {
                const latest = getLatestPolicy(row);
                if (latest) navigate(paths.accounts.insuranceView(latest.id));
            },
            hidden: (row: InsuranceChecklistRow) => row.policies.length === 0,
        },
        {
            label: "Add Payment (Renewal)",
            icon: <RefreshCcw className="h-4 w-4" />,
            onClick: (row: InsuranceChecklistRow) => {
                const latest = getLatestPolicy(row);
                if (latest) navigate(paths.operations.raiseProjectInsuranceRenewalForm(projectId!, latest.id));
            },
            hidden: (row: InsuranceChecklistRow) => row.policies.length === 0,
        },
    ], [navigate, projectId]);

    const insuranceColumns = useMemo<ColDef<InsuranceChecklistRow>[]>(() => [
        {
            field: "categoryName",
            headerName: "Insurance Type",
            sortable: true,
            filter: true,
            width: 180,
            cellRenderer: (p: CustomCellRendererProps<InsuranceChecklistRow>) => (
                <div>
                    <span className="text-sm font-medium">{p.value}</span>
                    {p.data && p.data.types.length > 1 && (
                        <span className="text-xs text-muted-foreground block">
                            {p.data.types.join(" / ")}
                        </span>
                    )}
                </div>
            ),
        },
        {
            headerName: "Status",
            filter: false,
            sortable: false,
            width: 130,
            cellRenderer: (p: CustomCellRendererProps<InsuranceChecklistRow>) => {
                const status = p.data ? getRowStatus(p.data) : "Pending";
                return (
                    <Badge variant={STATUS_BADGE_VARIANT[status] ?? "outline"} className="h-5 px-2">
                        {status}
                    </Badge>
                );
            },
        },
        {
            headerName: "Policy Type",
            filter: false,
            sortable: false,
            width: 120,
            valueGetter: (params) => {
                const latest = params.data ? getLatestPolicy(params.data) : null;
                return latest?.insuranceType ?? "—";
            },
        },
        {
            field: "policies",
            headerName: "Policy Number",
            sortable: false,
            filter: false,
            width: 160,
            valueGetter: (params) => {
                const latest = params.data ? getLatestPolicy(params.data) : null;
                return latest?.policyNumber ?? "—";
            },
        },
        {
            field: "policies",
            headerName: "Insurer",
            sortable: false,
            filter: false,
            width: 160,
            valueGetter: (params) => {
                const latest = params.data ? getLatestPolicy(params.data) : null;
                return latest?.insurerName ?? "—";
            },
        },
        {
            field: "policies",
            headerName: "Validity",
            sortable: false,
            filter: false,
            width: 200,
            valueGetter: (params) => {
                const latest = params.data ? getLatestPolicy(params.data) : null;
                if (!latest?.startDate || !latest?.endDate) return "—";
                return `${formatDate(latest.startDate)} to ${formatDate(latest.endDate)}`;
            },
        },
        {
            field: "policies",
            headerName: "Sum Assured",
            sortable: false,
            filter: false,
            width: 140,
            valueGetter: (params) => {
                const latest = params.data ? getLatestPolicy(params.data) : null;
                return latest?.sumAssured ?? "—";
            },
            valueFormatter: (p) => {
                if (p.value === "—") return "—";
                return formatINR(p.value);
            },
        },
        {
            field: "policies",
            headerName: "Added By",
            sortable: false,
            filter: false,
            width: 140,
            valueGetter: (params) => {
                const latest = params.data ? getLatestPolicy(params.data) : null;
                return latest?.createdByName ?? "—";
            },
        },
        {
            headerName: "",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<InsuranceChecklistRow>(insuranceActions),
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
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold">Insurance</CardTitle>
                        <CardDescription>
                            {coveredCount} of {TOTAL_CATEGORIES} insurance types covered
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={coveredCount === TOTAL_CATEGORIES ? "success" : "secondary"}>
                            {coveredCount}/{TOTAL_CATEGORIES}
                        </Badge>
                        <CardAction>
                            <Button size="sm" variant="default" onClick={() => navigate(paths.operations.raiseProjectInsuranceForm(projectId))}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Add Insurance
                            </Button>
                        </CardAction>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={checklistRows}
                    columnDefs={insuranceColumns}
                    gridOptions={{
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>
        </Card>
    );
};
