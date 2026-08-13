import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Plus, Eye, Pencil, Search, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { useCustomers } from "@/hooks/api/useCustomer";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import { AllotEngineerModal } from "./components/AllotEngineerModal";
import type { CustomerComplaintListItem, CustomerComplaintDetail } from "./helpers/customer.types";

const COMPLAINT_SLA_MS = 12 * 60 * 60 * 1000;

type StatusTab = "pending" | "done";

const isDoneStatus = (status?: string | null) => status === "Done";

function ComplaintTimerCell({
    createdAt,
    allotedEngineer,
    allottedAt,
}: {
    createdAt?: string | null;
    allotedEngineer?: boolean;
    allottedAt?: string | null;
}) {
    const [now, setNow] = useState(() => Date.now());
    const frozenSeconds = useRef<number | null>(null);

    const end = createdAt ? new Date(createdAt).getTime() + COMPLAINT_SLA_MS : null;

    useEffect(() => {
        if (allotedEngineer) return;
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [allotedEngineer]);

    const remaining = end === null ? 0 : Math.max(0, Math.floor((end - now) / 1000));

    if (end === null) {
        return <TenderTimerDisplay remainingSeconds={0} status="TIMER_NOT_FOUND" />;
    }

    if (allotedEngineer) {
        const stopMs = allottedAt ? new Date(allottedAt).getTime() : null;
        if (stopMs !== null) {
            frozenSeconds.current = Math.max(0, Math.floor((end - stopMs) / 1000));
        } else if (frozenSeconds.current === null) {
            frozenSeconds.current = remaining;
        }
        return <TenderTimerDisplay remainingSeconds={frozenSeconds.current} status="STOPPED" />;
    }

    const overdue = end - now <= 0;

    return (
        <TenderTimerDisplay
            remainingSeconds={remaining}
            status={overdue ? "OVERDUE" : "RUNNING"}
            deadline={new Date(end)}
        />
    );
}

export default function CustomerListPage() {
    const navigate = useNavigate();
    const { data: complaints = [], isLoading } = useCustomers();

    const [allotOpen, setAllotOpen] = useState(false);
    const [allotComplaint, setAllotComplaint] = useState<CustomerComplaintDetail | null>(null);

    const { activeTab, setActiveTab, search, setSearch, debouncedSearch } = usePersistentTableState<StatusTab>({
        storageKey: "customer-complaints-list",
        defaultTab: "pending",
    });

    const statusTab = activeTab;

    const rows = useMemo(() => {
        let filtered = complaints;
        if (statusTab === "pending") {
            filtered = filtered.filter(row => !isDoneStatus(row.status));
        } else if (statusTab === "done") {
            filtered = filtered.filter(row => isDoneStatus(row.status));
        }

        const query = debouncedSearch.trim().toLowerCase();
        if (!query) return filtered;
        return filtered.filter(row =>
            [row.ticketNo, row.organization, row.siteProjectName, row.siteLocation, row.issueFaced]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [complaints, debouncedSearch, statusTab]);

    const actions: ActionItem<CustomerComplaintListItem>[] = [
        {
            label: "View",
            onClick: row => navigate(paths.services.customerView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit",
            onClick: row => navigate(paths.services.customerEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Allot Engineer",
            onClick: row => {
                setAllotComplaint(row as unknown as CustomerComplaintDetail);
                setAllotOpen(true);
            },
            icon: <UserPlus className="h-4 w-4" />,
        },
    ];

    const colDefs = useMemo<ColDef<CustomerComplaintListItem>[]>(() => {
        return [
            { field: "ticketNo", headerName: "Ticket No.", width: 130 },
            { field: "organization", headerName: "Organization", width: 160 },
            { field: "siteProjectName", headerName: "Site/Project", width: 160 },
            { field: "siteLocation", headerName: "Site Location", minWidth: 160 },
            { field: "issueFaced", headerName: "Issue Faced", width: 160 },
            {
                colId: "status",
                headerName: "Status",
                width: 120,
                sortable: false,
                cellRenderer: (params: CustomCellRendererProps<CustomerComplaintListItem>) => {
                    const value = params.data?.status ?? "Pending";
                    return (
                        <Badge
                            className={cn(
                                "capitalize",
                                value === "Pending"
                                    ? "bg-amber-100 text-amber-800 border-transparent"
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
                cellRenderer: (params: CustomCellRendererProps<CustomerComplaintListItem>) => (
                    <ComplaintTimerCell
                        createdAt={params.data?.createdAt}
                        allotedEngineer={params.data?.status !== "Pending"}
                        allottedAt={params.data?.allottedAt}
                    />
                ),
            },
            {
                colId: "actions",
                headerName: "Actions",
                width: 100,
                pinned: "right",
                sortable: false,
                filter: false,
                cellRenderer: createActionColumnRenderer(actions),
            },
        ];
    }, [navigate, allotOpen]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Customer Complaints</CardTitle>
                        <CardDescription>All customer complaints listed</CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.services.customerCreate)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Complaint
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <Tabs value={statusTab} onValueChange={v => setActiveTab(v as StatusTab)}>
                        <TabsList>
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="done">Done</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search complaints..."
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

            <AllotEngineerModal
                open={allotOpen}
                onOpenChange={setAllotOpen}
                complaintId={allotComplaint?.id ?? null}
                ticketNo={allotComplaint?.ticketNo}
            />
        </Card>
    );
}