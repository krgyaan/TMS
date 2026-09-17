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
import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import { formatINR } from "@/hooks/useINRFormatter";
import type { OemPerformanceParams, RfqSentToOemRow } from "../helpers/oem-performance.types";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { TenderNameCell } from "@/components/data-grid/renderers/TenderNameCell";

interface RfqsSentTableProps {
    params: OemPerformanceParams | null;
}

export default function RfqsSentTable({ params }: RfqsSentTableProps) {
    const navigate = useNavigate();
    const { data, isLoading } = useOemPerformance(params);

    const rfqs = useMemo(() => data?.tendersByKpi.rfqsSent ?? [], [data]);
    const respondedCount = useMemo(() => rfqs.filter(r => r.rfqResponseOn !== null).length, [rfqs]);

    const actions = useMemo<ActionItem<RfqSentToOemRow>[]>(
        () => [{ label: "View", icon: <Eye className="h-4 w-4" />, onClick: row => navigate(paths.tendering.tenderView(row.id)) }],
        [navigate]
    );

    const columnDefs = useMemo<ColDef<RfqSentToOemRow>[]>(
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
                valueGetter: params => Number(params.data?.gstValues || 0),
                cellRenderer: (p: CustomCellRendererProps<RfqSentToOemRow>) => <span className="tabular-nums">{formatINR(Number(p.value))}</span>,
            },
            { field: "dueDate", headerName: "Due Date", sortable: true, filter: false, width: 170 },
            { field: "rfqSentOn", headerName: "RFQ Sent On", sortable: true, filter: false, width: 170 },
            {
                field: "rfqResponseOn",
                headerName: "Response On",
                sortable: true,
                filter: true,
                width: 170,
                valueFormatter: p => (p.value ? String(p.value) : "Pending"),
                cellRenderer: (p: CustomCellRendererProps<RfqSentToOemRow>) =>
                    p.value ? (
                        <Badge variant="default" className="h-5 px-2 font-normal">
                            {String(p.value)}
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="h-5 px-2 font-normal">
                            Pending
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
                        <CardTitle className="text-base font-semibold">RFQs Sent to This OEM</CardTitle>
                        <CardDescription>
                            {respondedCount} of {rfqs.length} RFQs responded
                        </CardDescription>
                    </div>
                    <Badge variant={respondedCount === rfqs.length && rfqs.length > 0 ? "success" : "secondary"}>
                        {respondedCount}/{rfqs.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable data={rfqs} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} />
            </CardContent>
        </Card>
    );
}
