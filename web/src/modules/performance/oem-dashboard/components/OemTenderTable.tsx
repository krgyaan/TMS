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
import { formatINR } from "@/hooks/useINRFormatter";
import type { NotAllowedTenderRow, LifecycleTenderRow, RfqSentToOemRow, OemPerformanceParams, TendersByKpi } from "../helpers/oem-performance.types";
import { OEM_TABS } from "../helpers/oem-performance.types";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { TenderNameCell } from "@/components/data-grid/renderers/TenderNameCell";

/* ─── Union row type with optional tab-specific fields ─────────────────────── */

type OemTenderRow = (NotAllowedTenderRow | LifecycleTenderRow | RfqSentToOemRow) & {
    reason?: string;
    rfqResponseOn?: string | null;
    status?: string;
    createdAt?: string;
    submissionTime?: string;
};

/* ─── Component ────────────────────────────────────────────────────────────── */

interface OemTenderTableProps {
    params: OemPerformanceParams | null;
    tab: string;
    data: { tendersByKpi: TendersByKpi } | undefined;
    isLoading: boolean;
}

export default function OemTenderTable({ params, tab, data, isLoading }: OemTenderTableProps) {
    const navigate = useNavigate();

    const rows = useMemo<OemTenderRow[]>(() => {
        if (!data) return [];
        const kpi = data.tendersByKpi;
        switch (tab) {
            case "rfq_sent":
                return kpi.rfqsSent;
            case "tenders_not_allowed":
                return kpi.tendersNotAllowed;
            case "tenders_missed":
                return kpi.tendersMissed;
            case "tenders_bid":
                return kpi.tendersSubmitted;
            case "tender_results_awaited":
                return kpi.tenderResultsAwaited;
            case "tenders_disqualified":
                return kpi.tendersDisqualified;
            case "tenders_won":
                return kpi.tendersWon;
            case "tenders_lost":
                return kpi.tendersLost;
            case "quotation_received":
                return kpi.quotationReceived;
            default:
                return [];
        }
    }, [data, tab]);

    const actions = useMemo<ActionItem<OemTenderRow>[]>(
        () => [{ label: "View", icon: <Eye className="h-4 w-4" />, onClick: row => navigate(paths.tendering.tenderView(row.id)) }],
        [navigate]
    );

    const columnDefs = useMemo<ColDef<OemTenderRow>[]>(() => {
        const common: ColDef<OemTenderRow>[] = [
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
                headerName: "Tender Value",
                sortable: true,
                filter: false,
                width: 150,
                type: ["numericColumn"],
                valueGetter: params => Number(params.data?.gstValues || 0),
                cellRenderer: (p: CustomCellRendererProps<OemTenderRow>) => <span className="tabular-nums">{formatINR(Number(p.value))}</span>,
            },
            { field: "dueDate", headerName: "Due Date", sortable: true, filter: false, width: 170 },
        ];

        const actionCol: ColDef<OemTenderRow> = {
            headerName: "",
            filter: false,
            sortable: false,
            width: 80,
            pinned: "right",
            cellRenderer: createActionColumnRenderer(actions),
        };

        switch (tab) {
            case "rfq_sent":
                return [
                    ...common,
                    { field: "createdAt", headerName: "RFQ Sent", sortable: true, filter: false, width: 170 },
                    {
                        field: "rfqResponseOn",
                        headerName: "Response On",
                        sortable: true,
                        filter: true,
                        width: 170,
                        valueFormatter: p => (p.value ? String(p.value) : "Pending"),
                        cellRenderer: (p: CustomCellRendererProps<OemTenderRow>) =>
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
                    actionCol,
                ];
            case "tenders_bid":
                return [
                    ...common,
                    { field: "submissionTime", headerName: "Submission Time", sortable: true, filter: false, width: 170 },
                    {
                        field: "status",
                        headerName: "Status",
                        sortable: true,
                        filter: true,
                        width: 150,
                        cellRenderer: (p: CustomCellRendererProps<OemTenderRow>) => (
                            <Badge variant="secondary" className="h-5 px-2 font-normal">
                                {p.value}
                            </Badge>
                        ),
                    },
                    actionCol,
                ];
            case "tenders_not_allowed":
                return [
                    ...common,
                    {
                        field: "reason",
                        headerName: "Reason",
                        sortable: true,
                        filter: true,
                        width: 220,
                        cellRenderer: (p: CustomCellRendererProps<OemTenderRow>) => (
                            <Badge variant="secondary" className="h-5 px-2 font-normal">
                                {p.value}
                            </Badge>
                        ),
                    },
                    actionCol,
                ];
            case "quotation_received":
                return [
                    ...common,
                    { field: "createdAt", headerName: "RFQ Sent On", sortable: true, filter: false, width: 170 },
                    {
                        field: "rfqResponseOn",
                        headerName: "Response On",
                        sortable: true,
                        filter: true,
                        width: 170,
                        valueFormatter: p => (p.value ? String(p.value) : "Pending"),
                        cellRenderer: (p: CustomCellRendererProps<OemTenderRow>) =>
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
                    actionCol,
                ];
            default:
                return [
                    ...common,
                    { field: "createdAt", headerName: "Rfq Sent On", sortable: true, filter: false, width: 170 },
                    {
                        field: "status",
                        headerName: "Status",
                        sortable: true,
                        filter: true,
                        width: 150,
                        cellRenderer: (p: CustomCellRendererProps<OemTenderRow>) => (
                            <Badge variant="secondary" className="h-5 px-2 font-normal">
                                {p.value}
                            </Badge>
                        ),
                    },
                    actionCol,
                ];
        }
    }, [actions, tab]);

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

    const activeTab = OEM_TABS.find(t => t.key === tab) ?? OEM_TABS[0];

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold">{activeTab.label}</CardTitle>
                        <CardDescription>Tenders in this category for the selected OEM and date range.</CardDescription>
                    </div>
                    <Badge variant="secondary">{rows.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {rows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No tenders found for this category.</div>
                ) : (
                    <DataTable data={rows} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} />
                )}
            </CardContent>
        </Card>
    );
}