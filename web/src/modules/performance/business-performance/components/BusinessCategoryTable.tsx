import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";

/* Icons */
import { ChevronDown, Eye } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useBusinessPerformance } from "@/hooks/api/useBusinessPerformance";
import { formatINR } from "@/hooks/useINRFormatter";
import type { BusinessPerformanceParams, BusinessTenderListItem } from "../helpers/business-performance.types";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { TenderNameCell } from "@/components/data-grid/renderers/TenderNameCell";

interface BusinessCategoryTableProps {
    params: BusinessPerformanceParams | null;
    categoryKey: string;
    title: string;
    description: string;
}

export default function BusinessCategoryTable({ params, categoryKey, title, description }: BusinessCategoryTableProps) {
    const navigate = useNavigate();
    const { data, isLoading } = useBusinessPerformance(params);
    const [isOpen, setIsOpen] = useState(true);

    const tenders = useMemo(() => (data?.tenderList ?? []).filter(t => t.category.includes(categoryKey)), [data, categoryKey]);

    const actions = useMemo<ActionItem<BusinessTenderListItem>[]>(
        () => [{ label: "View", icon: <Eye className="h-4 w-4" />, onClick: row => navigate(paths.tendering.tenderView(row.id)) }],
        [navigate]
    );

    const columnDefs = useMemo<ColDef<BusinessTenderListItem>[]>(
        () => [
            { field: "team", headerName: "Team", sortable: true, filter: true, width: 120 },
            { field: "member", headerName: "Team Member", sortable: true, filter: true, width: 150 },
            { field: "item", headerName: "Item", sortable: true, filter: true, width: 130 },
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
                headerName: "Tender Value",
                sortable: true,
                filter: false,
                width: 150,
                type: ["numericColumn"],
                valueGetter: p => Number(p.data?.gstValues || 0),
                cellRenderer: (p: CustomCellRendererProps<BusinessTenderListItem>) => <span className="tabular-nums">{formatINR(Number(p.value))}</span>,
            },
            { field: "dueDate", headerName: "Due Date", sortable: true, filter: false, width: 170 },
            {
                field: "status",
                headerName: "Status",
                sortable: true,
                filter: true,
                width: 150,
                cellRenderer: (p: CustomCellRendererProps<BusinessTenderListItem>) => (
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
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CardHeader className="pb-4">
                    <CollapsibleTrigger asChild>
                        <div className="flex cursor-pointer items-center justify-between gap-2 transition-opacity hover:opacity-80">
                            <div>
                                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                                <CardDescription>{description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{tenders.length}</Badge>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            </div>
                        </div>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="pt-0">
                        <DataTable data={tenders} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} />
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
