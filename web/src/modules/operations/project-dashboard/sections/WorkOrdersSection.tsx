import React, { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { GridApi } from "ag-grid-community";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";

interface WorkOrdersSectionProps {
    woBasicDetail: any;
}

export const WorkOrdersSection: React.FC<WorkOrdersSectionProps> = ({
    woBasicDetail,
}) => {
    const [woGridApi, setWoGridApi] = useState<GridApi | null>(null);

    const woActions: ActionItem<any>[] = useMemo(() => [
        {
            label: "WO Acceptance",
            onClick: (row) => console.log("Accept WO", row),
        },
        {
            label: "WO Update",
            onClick: (row) => console.log("Update WO", row),
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => console.log("View WO", row),
        },
    ], []);

    const woData = useMemo(() => {
        if (!woBasicDetail?.number) return [];
        return [woBasicDetail];
    }, [woBasicDetail]);

    const woColumns = useMemo(() => [
        {
            field: "number",
            headerName: "WO Number",
            sortable: true,
            filter: true,
            cellRenderer: (p: any) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "parGst",
            headerName: "WO Value",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatINR(p.value),
            cellClass: "tabular-nums font-medium",
        },
        {
            field: "ldStartDate",
            headerName: "LD Start Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "maxLdDate",
            headerName: "Max LD Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "pbgApplicable",
            headerName: "PBG",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: any) => (
                <Badge variant={p.value ? "default" : "secondary"} className="text-xs">
                    {p.value ? "Yes" : "No"}
                </Badge>
            ),
        },
        {
            field: "contractAgreement",
            headerName: "Contract",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: any) => (
                <Badge variant={p.value ? "default" : "secondary"} className="text-xs">
                    {p.value ? "Yes" : "No"}
                </Badge>
            ),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<any>(woActions),
            width: 80,
            pinned: "right" as "right" | "left" | undefined
        },
    ], []);

    return (
        <Card>
            <CardHeader className="pb-4">
                <div>
                    <CardTitle className="text-base font-semibold">
                        Work Orders
                    </CardTitle>
                    <CardDescription>
                        {woData.length} order{woData.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={woData}
                    columnDefs={woColumns}
                    onGridReady={(params) => setWoGridApi(params.api)}
                    gridOptions={{
                        domLayout: 'autoHeight',
                    }}
                />
            </CardContent>
        </Card>
    );
};
