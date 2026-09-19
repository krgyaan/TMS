import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";

/* Icons */
import { Eye } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useCustomerPerformance } from "@/hooks/api/useCustomerPerformance";
import { formatINR } from "@/hooks/useINRFormatter";
import type { CustomerPerformanceParams, TenderListItem } from "../helpers/customer-performance.types";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { TenderNameCell } from "@/components/data-grid/renderers/TenderNameCell";

interface TendersAssignedTableProps {
    params: CustomerPerformanceParams | null;
}

export default function TendersAssignedTable({ params }: TendersAssignedTableProps) {
    const navigate = useNavigate();
    const { data, isLoading } = useCustomerPerformance(params);

    const tenders = useMemo(() => data?.tenderList ?? [], [data]);

    const actions = useMemo<ActionItem<TenderListItem>[]>(
        () => [{ label: "View", icon: <Eye className="h-4 w-4" />, onClick: row => navigate(paths.tendering.tenderView(row.id)) }],
        [navigate]
    );

    const columnDefs = useMemo<ColDef<TenderListItem>[]>(
        () => [
            { field: "member", headerName: "Team Member", sortable: true, filter: true, width: 150 },
            {
                field: "tenderNo",
                headerName: "Tender",
                sortable: true,
                filter: true,
                flex: 1,
                minWidth: 220,
                cellRenderer: TenderNameCell,
            },
            {
                field: "gstValues",
                headerName: "GST Value",
                sortable: true,
                filter: false,
                width: 150,
                type: ["numericColumn"],
                valueGetter: p => Number(p.data?.gstValues || 0),
                cellRenderer: (p: CustomCellRendererProps<TenderListItem>) => <span className="tabular-nums">{formatINR(Number(p.value))}</span>,
            },
            { field: "dueDate", headerName: "Due Date", sortable: true, filter: false, width: 170 },
            { field: "createdAt", headerName: "Rfq Sent On", sortable: true, filter: false, width: 170 },
            {
                field: "status",
                headerName: "Status",
                sortable: true,
                filter: true,
                width: 150,
                cellRenderer: (p: CustomCellRendererProps<TenderListItem>) => (
                    <Badge variant="secondary" className="h-5 px-2 font-normal">
                        {p.value}
                    </Badge>
                ),
            },
            { headerName: "", filter: false, sortable: false, width: 80, pinned: "right", cellRenderer: createActionColumnRenderer(actions) },
        ],
        [actions]
    );

    if (!params) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-52" />
                    <Skeleton className="h-4 w-80" />
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
                        <CardTitle className="text-base font-semibold">Tenders Assigned</CardTitle>
                        <CardDescription>Tenders assigned to this customer.</CardDescription>
                    </div>
                    <Badge variant="secondary">{tenders.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable data={tenders} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} />
            </CardContent>
        </Card>
    );
}
