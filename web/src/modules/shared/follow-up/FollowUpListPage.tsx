import { useCallback, useMemo, useState, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import type { ColDef } from "ag-grid-community";
import { AlertCircle, Calendar, Clock, FileX2, Plus, Search, TrendingUp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useDeleteFollowUp, useFollowUpCounts, useFollowUps } from "@/hooks/api/useFollowUps";
import type { FollowUpTab } from "./helpers/followUp.constants";
import type { ContactPerson, FollowUpListRow, FollowUpQueryParams } from "./helpers/followUp.types";
import { createFollowUpColumns } from "./components/followUpColumns";
import { FollowUpContactsDialog } from "./components/FollowUpContactsDialog";
import { FollowUpStatusDialog } from "./components/FollowUpStatusDialog";

const FollowUpListPage = () => {
    const navigate = useNavigate();
    const { canDelete } = useAuth();

    const {
        activeTab,
        setActiveTab,
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState<FollowUpTab>({
        storageKey: "shared-follow-ups",
        defaultTab: "ongoing",
    });

    const queryParams = useMemo<FollowUpQueryParams>(
        () => ({
            tab: activeTab,
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        }),
        [activeTab, pagination.pageIndex, pagination.pageSize, debouncedSearch, sortModel]
    );

    const { data: apiResponse, isLoading: loading, error } = useFollowUps(queryParams);
    const { data: counts } = useFollowUpCounts();
    const deleteMutation = useDeleteFollowUp();

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState<ContactPerson[]>([]);

    const handleDelete = useCallback(
        (row: FollowUpListRow) => {
            if (window.confirm("Are you sure you want to delete this follow-up?")) {
                deleteMutation.mutate(row.id);
            }
        },
        [deleteMutation]
    );

    const handleViewContacts = useCallback((contacts: ContactPerson[]) => {
        setSelectedContacts(contacts);
        setContactsDialogOpen(true);
    }, []);

    const columns = useMemo(
        () =>
            createFollowUpColumns({
                onView: row => navigate(paths.shared.followUpShow(row.id)),
                onEdit: row => navigate(paths.shared.followUpEdit(row.id)),
                onUpdateStatus: row => {
                    setSelectedId(row.id);
                    setStatusDialogOpen(true);
                },
                onViewContacts: handleViewContacts,
                onDelete: handleDelete,
                canDelete: canDelete("shared.followups"),
            }),
        [navigate, canDelete, handleDelete, handleViewContacts]
    );

    const tabsConfig: { key: FollowUpTab; label: string; icon: ElementType; count?: number }[] = [
        { key: "ongoing", label: "Ongoing", icon: Clock, count: counts?.ongoing },
        { key: "achieved", label: "Achieved", icon: TrendingUp, count: counts?.achieved },
        { key: "angry", label: "Angry / External", icon: AlertCircle, count: counts?.angry },
        { key: "future", label: "Future", icon: Calendar, count: counts?.future },
    ];

    if (loading && !apiResponse) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-48" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-10 w-32" />
                            ))}
                        </div>
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Follow-ups</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Failed to load follow-ups. Please try again later.</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex h-full min-h-0 flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle>Follow-ups</CardTitle>
                    <CardDescription>
                        {totalRows} {totalRows === 1 ? "record" : "records"}
                    </CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate(paths.shared.followUpCreate)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Follow-up
                </Button>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0">
                <div className="flex flex-wrap items-center justify-between gap-4 px-6">
                    <Tabs value={activeTab} onValueChange={value => setActiveTab(value as FollowUpTab)}>
                        <TabsList>
                            {tabsConfig.map(tab => (
                                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                                    <tab.icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                    {(tab.count ?? 0) > 0 && (
                                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                                            {tab.count}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search follow ups..."
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="relative min-h-0 flex-1 px-6">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileX2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                            <p className="text-sm font-medium">No follow-ups found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {search ? "Try adjusting your search query" : "Create a new follow-up to get started"}
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            data={rows}
                            columnDefs={columns as ColDef<any>[]}
                            loading={loading}
                            manualPagination
                            rowCount={totalRows}
                            paginationState={pagination}
                            onPaginationChange={setPagination}
                            onPageSizeChange={handlePageSizeChange}
                            showTotalCount
                            showLengthChange
                            gridOptions={{
                                defaultColDef: {
                                    editable: false,
                                    filter: true,
                                    sortable: true,
                                    resizable: true,
                                },
                                onSortChanged: handleSortChanged,
                                overlayNoRowsTemplate:
                                    '<span style="padding: 10px; text-align: center;">No follow-ups found</span>',
                            }}
                        />
                    )}
                </div>
            </CardContent>

            <FollowUpStatusDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} followUpId={selectedId} />
            <FollowUpContactsDialog open={contactsDialogOpen} onOpenChange={setContactsDialogOpen} contacts={selectedContacts} />
        </Card>
    );
};

export default FollowUpListPage;
