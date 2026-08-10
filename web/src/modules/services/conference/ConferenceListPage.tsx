import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Eye, Search, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { useConferenceList } from "@/hooks/api/useConference";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import type { ConferenceListItemWithReport } from "./helpers/conference.types";

const CONFERENCE_SLA_MS = 12 * 60 * 60 * 1000;

function ConferenceTimerCell({ engineerAllottedAt }: { engineerAllottedAt?: string | null }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const end = engineerAllottedAt ? new Date(engineerAllottedAt).getTime() + CONFERENCE_SLA_MS : null;
    const overdue = end !== null && end - now <= 0;

    if (end === null) {
        return <TenderTimerDisplay remainingSeconds={0} status="TIMER_NOT_FOUND" />;
    }

    return (
        <TenderTimerDisplay
            remainingSeconds={Math.max(0, Math.floor((end - now) / 1000))}
            status={overdue ? "OVERDUE" : "RUNNING"}
            deadline={new Date(end)}
        />
    );
}

export default function ConferenceListPage() {
    const navigate = useNavigate();
    const { data: conferences = [], isLoading } = useConferenceList();

    const { search, setSearch, debouncedSearch } = usePersistentTableState({
        storageKey: "conference-call-reports-list",
        defaultTab: "all",
    });

    const rows = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();
        if (!query) return conferences;
        return conferences.filter(row =>
            [row.ticketNo, row.siteProjectName, row.customerName, row.organization, row.siteLocation, row.serviceEngineerName]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [conferences, debouncedSearch]);

    const actions: ActionItem<ConferenceListItemWithReport>[] = [
        {
            label: "Enter Details",
            onClick: row => navigate(`${paths.services.conferenceCreate}?complaintId=${row.complaintId}`),
            icon: <FileText className="h-4 w-4" />,
        },
        {
            label: "View",
            onClick: row => {
                if (row.conferenceId) {
                    navigate(paths.services.conferenceView(row.conferenceId));
                }
            },
            icon: <Eye className="h-4 w-4" />,
            visible: row => !!row.conferenceId,
        },
    ];

    const colDefs = useMemo<ColDef<ConferenceListItemWithReport>[]>(() => {
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
                cellRenderer: (params: CustomCellRendererProps<ConferenceListItemWithReport>) => {
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
                colId: "timer",
                headerName: "Timer",
                width: 110,
                sortable: false,
                filter: false,
                cellRenderer: (params: CustomCellRendererProps<ConferenceListItemWithReport>) => (
                    <ConferenceTimerCell engineerAllottedAt={params.data?.engineerAllottedAt} />
                ),
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
                    <CardTitle>Conference Call Reports</CardTitle>
                    <CardDescription>Complaints with allotted engineers</CardDescription>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search conference reports..."
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
