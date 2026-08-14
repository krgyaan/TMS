import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Eye, Search, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useServiceVisitList } from "@/hooks/api/useServiceVisit";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import type { ServiceVisitListItemWithReport } from "./helpers/service-visit.types";

type StatusTab = "pending" | "done";

const isDoneStatus = (status?: string | null) => status === "Done";

export default function ServiceVisitListPage() {
    const navigate = useNavigate();
    const { data: visits = [], isLoading } = useServiceVisitList();

    const { activeTab, setActiveTab, search, setSearch, debouncedSearch } = usePersistentTableState<StatusTab>({
        storageKey: "service-visit-reports-list",
        defaultTab: "pending",
    });

    const statusTab = activeTab;

    const statusCounts = useMemo(() => {
        return {
            pending: visits.filter(row => !isDoneStatus(row.complaintStatus)).length,
            done: visits.filter(row => isDoneStatus(row.complaintStatus)).length,
        };
    }, [visits]);

    const rows = useMemo(() => {
        let filtered = visits;
        if (statusTab === "pending") {
            filtered = filtered.filter(row => !isDoneStatus(row.complaintStatus));
        } else if (statusTab === "done") {
            filtered = filtered.filter(row => isDoneStatus(row.complaintStatus));
        }

        const query = debouncedSearch.trim().toLowerCase();
        if (!query) return filtered;
        return filtered.filter(row =>
            [row.ticketNo, row.siteProjectName, row.customerName, row.organization, row.siteLocation, row.serviceEngineerName]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [visits, debouncedSearch, statusTab]);

    const actions: ActionItem<ServiceVisitListItemWithReport>[] = [
        {
            label: "Enter Details",
            onClick: row => navigate(`${paths.services.visitCreate}?complaintId=${row.complaintId}`),
            icon: <FileText className="h-4 w-4" />,
        },
        {
            label: "View",
            onClick: row => {
                if (row.reportId) {
                    navigate(paths.services.visitView(row.reportId));
                }
            },
            icon: <Eye className="h-4 w-4" />,
            visible: row => !!row.reportId,
        },
    ];

    const colDefs = useMemo<ColDef<ServiceVisitListItemWithReport>[]>(() => {
        return [
            { field: "ticketNo", headerName: "Ticket No.", width: 130 },
            { field: "siteProjectName", headerName: "Site Name", width: 160 },
            { field: "customerName", headerName: "Customer", width: 160 },
            { field: "organization", headerName: "Organization", minWidth: 160 },
            { field: "siteLocation", headerName: "Site Location", width: 160 },
            { field: "serviceEngineerName", headerName: "Service Engineer", width: 160 },
            {
                colId: "status",
                headerName: "Status",
                width: 120,
                sortable: false,
                cellRenderer: (params: CustomCellRendererProps<ServiceVisitListItemWithReport>) => {
                    const value = params.data?.complaintStatus ?? "Pending";
                    return (
                        <Badge
                            className={cn(
                                "capitalize",
                                value === "Pending"
                                    ? "bg-amber-100 text-amber-800 border-transparent"
                                    : value === "In Progress"
                                      ? "bg-blue-100 text-blue-800 border-transparent"
                                      : "bg-emerald-100 text-emerald-800 border-transparent",
                            )}
                        >
                            {value}
                        </Badge>
                    );
                },
            },
            {
                colId: "actions",
                headerName: "Actions",
                width: 130,
                pinned: "right",
                sortable: false,
                filter: false,
                cellRenderer: createActionColumnRenderer(actions),
            },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div>
                    <CardTitle>Service Visits</CardTitle>
                    <CardDescription>Complaints with conference report submitted</CardDescription>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <Tabs value={statusTab} onValueChange={v => setActiveTab(v as StatusTab)}>
                        <TabsList>
                            <TabsTrigger value="pending">
                                <span className="flex items-center gap-1.5">
                                    Pending
                                    <Badge variant="secondary" className="h-4 min-w-5 px-1">
                                        {statusCounts.pending}
                                    </Badge>
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="done">
                                <span className="flex items-center gap-1.5">
                                    Done
                                    <Badge variant="secondary" className="h-4 min-w-5 px-1">
                                        {statusCounts.done}
                                    </Badge>
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search service visits..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

                <DataTable
                    data={rows}
                    loading={isLoading}
                    columnDefs={colDefs}
                    gridOptions={{
                        defaultColDef: { filter: true, sortable: true },
                        pagination: true,
                    }}
                    enablePagination={true}
                />
            </CardContent>
        </Card>
    );
}
