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
import { Eye, Plus, RefreshCcw, ShieldCheck } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    ALL_INSURANCE_TYPES,
    TYPE_CATEGORY,
    TOTAL_INSURANCE_TYPES,
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

    const checklistRows = useMemo<InsuranceChecklistRow[]>(() => {
        const policiesByType = new Map<string, InsurancePolicyRow[]>();
        for (const policy of policies) {
            const type = policy.insuranceType;
            if (!policiesByType.has(type)) {
                policiesByType.set(type, []);
            }
            policiesByType.get(type)!.push(policy);
        }

        return ALL_INSURANCE_TYPES.map(typeName => ({
            typeName,
            category: TYPE_CATEGORY[typeName],
            policies: policiesByType.get(typeName) ?? [],
        }));
    }, [policies]);

    const coveredCount = useMemo(
        () => checklistRows.filter(r => r.policies.length > 0).length,
        [checklistRows]
    );

    const hasCar = useMemo(() => checklistRows.find(r => r.typeName === "CAR")?.policies.length ?? 0 > 0, [checklistRows]);
    const hasEar = useMemo(() => checklistRows.find(r => r.typeName === "EAR")?.policies.length ?? 0 > 0, [checklistRows]);

    const isAddDisabled = useCallback((typeName: string): boolean => {
        if (typeName === "EAR" && hasCar) return true;
        if (typeName === "CAR" && hasEar) return true;
        return false;
    }, [hasCar, hasEar]);

    const insuranceActions: ActionItem<InsuranceChecklistRow>[] = useMemo(() => [
        {
            label: "Add Insurance",
            icon: <Plus className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.raiseProjectInsuranceForm(projectId!) + `?type=${row.typeName}`),
            hidden: (row) => row.policies.length > 0 || isAddDisabled(row.typeName),
        },
        {
            label: "View Policy",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => {
                const latest = getLatestPolicy(row);
                if (latest) navigate(paths.accounts.insuranceView(latest.id));
            },
            hidden: (row) => row.policies.length === 0,
        },
        {
            label: "Add Payment (Renewal)",
            icon: <RefreshCcw className="h-4 w-4" />,
            onClick: (row) => {
                const latest = getLatestPolicy(row);
                if (latest) navigate(paths.operations.raiseProjectInsuranceRenewalForm(projectId!, latest.id));
            },
            hidden: (row) => row.policies.length === 0,
        },
    ], [navigate, projectId, isAddDisabled]);

    const insuranceColumns = useMemo<ColDef<InsuranceChecklistRow>[]>(() => [
        {
            field: "typeName",
            headerName: "Insurance Type",
            sortable: true,
            filter: true,
            width: 160,
            cellRenderer: (p: CustomCellRendererProps<InsuranceChecklistRow>) => (
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <span className="text-sm font-medium">{p.value}</span>
                        <span className="text-xs text-muted-foreground block">{p.data?.category}</span>
                    </div>
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
                return `${format(new Date(latest.startDate), "dd-MM-yyyy")} to ${format(new Date(latest.endDate), "dd-MM-yyyy")}`;
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
            headerName: "Actions",
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
                            {coveredCount} of {TOTAL_INSURANCE_TYPES} insurance types covered
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={coveredCount === TOTAL_INSURANCE_TYPES ? "success" : "secondary"}>
                            {coveredCount}/{TOTAL_INSURANCE_TYPES}
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
