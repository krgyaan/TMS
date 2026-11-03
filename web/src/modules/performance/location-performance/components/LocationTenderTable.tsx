import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* UI Components */
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

/* Icons */
import { Eye, Search } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { formatINR } from "@/hooks/useINRFormatter";
import type { LocationPerformanceParams, BusinessTenderListItem } from "../helpers/location-performance.types";
import { LOCATION_TABS } from "../helpers/location-tabs";

import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { TenderNameCell } from "@/components/data-grid/renderers/TenderNameCell";

interface LocationTenderTableProps {
    params: LocationPerformanceParams | null;
    tab: string;
    data: { tenderList?: BusinessTenderListItem[] } | undefined;
    isLoading: boolean;
}

export default function LocationTenderTable({ params, tab, data, isLoading }: LocationTenderTableProps) {
    const navigate = useNavigate();

    const [gridApi, setGridApi] = useState<GridApi<BusinessTenderListItem> | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    const onGridReady = useCallback((event: GridReadyEvent<BusinessTenderListItem>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [gridApi, debouncedSearch]);

    const rows = useMemo<BusinessTenderListItem[]>(() => {
        if (!data?.tenderList) return [];
        return data.tenderList.filter(t => t.category.includes(tab));
    }, [data, tab]);

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
                getQuickFilterText: p => `${p.data?.tenderNo ?? ""} ${p.data?.tenderName ?? ""}`,
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
            {
                field: "bidStatus",
                headerName: "Bid Status",
                sortable: true,
                filter: true,
                width: 150,
                cellRenderer: (p: CustomCellRendererProps<BusinessTenderListItem>) => (
                    <Badge variant="secondary" className="h-5 px-2 font-normal">
                        {p.value}
                    </Badge>
                ),
            },
            {
                field: "avgGrossMargin",
                headerName: "GP %",
                sortable: true,
                filter: false,
                width: 100,
                type: ["numericColumn"],
                cellRenderer: (p: CustomCellRendererProps<BusinessTenderListItem>) => <span className="tabular-nums">{p.value ? `${p.value}%` : "—"}</span>,
            },
            { headerName: "", filter: false, sortable: false, width: 80, pinned: "right", cellRenderer: createActionColumnRenderer(actions) },
        ],
        [actions]
    );

    if (!params) return null;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <Skeleton className="h-6 w-52" />
                        <Skeleton className="h-4 w-80 mt-1" />
                    </div>
                    <Skeleton className="h-9 w-56" />
                </div>
                <div className="border-t pt-6">
                    <Skeleton className="h-48 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    const activeTab = LOCATION_TABS.find(t => t.key === tab) ?? LOCATION_TABS[0];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="text-base font-semibold leading-none">{activeTab.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">{activeTab.description}</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search tenders..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 w-56"
                        aria-label="Search tenders"
                    />
                </div>
            </div>
            <div className="border-t pt-6">
                {rows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No tenders found for this category.</div>
                ) : (
                    <DataTable data={rows} columnDefs={columnDefs} gridOptions={{ domLayout: "autoHeight" }} onGridReady={onGridReady} />
                )}
            </div>
        </div>
    );
}
