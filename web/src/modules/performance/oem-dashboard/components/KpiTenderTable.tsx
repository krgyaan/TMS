import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";

/* Icons */
import { Eye } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { formatINR } from "@/hooks/useINRFormatter";
import type { TenderListItem } from "../helpers/oem-performance.types";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { TenderNameCell } from "@/components/data-grid/renderers/TenderNameCell";

interface KpiTenderTableProps {
    title: string;
    description?: string;
    tenders: TenderListItem[];
}

export default function KpiTenderTable({ title, description, tenders }: KpiTenderTableProps) {
    const navigate = useNavigate();

    const actions = useMemo<ActionItem<TenderListItem>[]>(
        () => [{ label: "View", icon: <Eye className="h-4 w-4" />, onClick: row => navigate(paths.tendering.tenderView(row.id)) }],
        [navigate]
    );

    const columnDefs = useMemo<ColDef<TenderListItem>[]>(
        () => [
            {
                field: "tenderNo",
                headerName: "Tender",
                sortable: true,
                filter: true,
                flex: 1,
                minWidth: 200,
                cellRenderer: TenderNameCell,
            },
            {
                field: "value",
                headerName: "Value",
                sortable: true,
                filter: false,
                width: 160,
                type: ["numericColumn"],
                cellRenderer: (p: CustomCellRendererProps<TenderListItem>) => <span className="tabular-nums">{formatINR(Number(p.value))}</span>,
            },
            {
                field: "status",
                headerName: "Status",
                sortable: true,
                filter: true,
                width: 180,
                cellRenderer: (p: CustomCellRendererProps<TenderListItem>) => (
                    <Badge variant="secondary" className="h-5 px-2 font-normal">
                        {p.value}
                    </Badge>
                ),
            },
            {
                headerName: "",
                filter: false,
                sortable: false,
                width: 80,
                pinned: "right",
                cellRenderer: createActionColumnRenderer(actions),
            },
        ],
        [actions]
    );

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold">{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                    <Badge variant="secondary">{tenders.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {tenders.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No tenders found for this section.</div>
                ) : (
                    <DataTable data={tenders} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} />
                )}
            </CardContent>
        </Card>
    );
}