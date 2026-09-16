import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
/* UI Components */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DataTable from "@/components/ui/data-table";

import { paths } from "@/app/routes/paths";
import { useOemPerformance } from "@/hooks/api/useOemPerformance";
import { formatINR } from "@/hooks/useINRFormatter";
import type { OemPerformanceParams, TenderListItem } from "../helpers/oem-performance.types";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";

interface WorkedWithOemTableProps {
    params: OemPerformanceParams | null;
}

interface WorkedWithRow {
    category: string;
    count: number;
    value: number;
    tenders: TenderListItem[];
}

function TendersCell({ tenders, onOpen }: { tenders: TenderListItem[]; onOpen: (id: number) => void }) {
    const visible = tenders.slice(0, 3);
    const rest = tenders.slice(3);

    const badge = (t: TenderListItem) => (
        <Badge
            key={t.id}
            variant="secondary"
            className="font-normal truncate max-w-[150px] cursor-pointer hover:bg-muted"
            title={`${t.tenderNo} — ${formatINR(t.value)}`}
            onClick={ev => {
                ev.stopPropagation();
                onOpen(t.id);
            }}
        >
            {t.tenderName}
        </Badge>
    );

    return (
        <div className="flex flex-wrap items-center gap-1">
            {visible.map(badge)}
            {rest.length > 0 && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Badge variant="outline" className="font-normal cursor-pointer" onClick={ev => ev.stopPropagation()}>
                            +{rest.length} more
                        </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="start">
                        <div className="flex flex-wrap gap-1">
                            {rest.map(badge)}
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

export default function WorkedWithOemTable({ params }: WorkedWithOemTableProps) {
    const navigate = useNavigate();
    const { data, isLoading } = useOemPerformance(params);

    const rows = useMemo<WorkedWithRow[]>(() => {
        const summary = data?.summary;
        const tendersByKpi = data?.tendersByKpi;
        if (!summary || !tendersByKpi) return [];

        return [
            {
                category: "Total",
                count: summary.totalTendersWithOem,
                value: summary.totalValueAssigned,
                tenders: tendersByKpi.total || [],
            },
            {
                category: "Won",
                count: summary.tendersWon,
                value: summary.totalValueWon,
                tenders: tendersByKpi.tendersWon || [],
            },
            {
                category: "Lost",
                count: summary.tendersLost,
                value: summary.totalValueLost,
                tenders: tendersByKpi.tendersLost || [],
            },
            {
                category: "Submitted",
                count: summary.tendersSubmitted,
                value: summary.totalValueSubmitted,
                tenders: tendersByKpi.tendersSubmitted || [],
            },
        ];
    }, [data]);

    const columnDefs = useMemo<ColDef<WorkedWithRow>[]>(
        () => [
            { field: "category", headerName: "Category", sortable: true, filter: true, width: 140, cellClass: "font-medium" },
            { field: "count", headerName: "Count", sortable: true, filter: false, width: 100, type: ["numericColumn"] },
            {
                field: "value",
                headerName: "Value",
                sortable: true,
                filter: false,
                width: 160,
                type: ["numericColumn"],
                cellRenderer: (p: CustomCellRendererProps<WorkedWithRow>) => <span className="tabular-nums">{formatINR(Number(p.value))}</span>,
            },
            {
                field: "tenders",
                headerName: "Tenders",
                sortable: false,
                filter: false,
                flex: 1,
                minWidth: 320,
                cellRenderer: (p: CustomCellRendererProps<WorkedWithRow>) => (
                    <TendersCell tenders={p.value ?? []} onOpen={id => navigate(paths.tendering.tenderView(id))} />
                ),
            },
        ],
        [navigate]
    );

    if (!params) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-52" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold">Worked With This OEM</CardTitle>
                        <CardDescription>Outcome breakdown for tenders assigned to this OEM.</CardDescription>
                    </div>
                    <Badge variant="secondary">{rows.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable data={rows} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} />
            </CardContent>
        </Card>
    );
}
