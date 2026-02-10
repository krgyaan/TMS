import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ColDef } from "ag-grid-community";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, Edit, FileX2, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/hooks/useFormatedDate";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { paths } from "@/app/routes/paths";
import { useMasterProjects } from "@/hooks/api/useMasterProjects";
import type { MasterProjectListRow } from "./helpers/masterProject.types";

const ProjectsListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: "asc" | "desc" }[]>([]);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const next = event.api
            .getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({ colId: col.colId, sort: col.sort as "asc" | "desc" }));
        setSortModel(next);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const { data: apiResponse, isLoading, error } = useMasterProjects(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const actions: ActionItem<MasterProjectListRow>[] = useMemo(
        () => [
            {
                label: "View",
                onClick: row => navigate(paths.documentDashboard.projectsView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: "Edit",
                onClick: row => navigate(paths.documentDashboard.projectsEdit(row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [navigate],
    );

    const colDefs = useMemo<ColDef<MasterProjectListRow>[]>(
        () => [
            {
                field: "teamName",
                colId: "teamName",
                headerName: "Team",
                flex: 1,
                minWidth: 80,
                valueGetter: params => params.data?.teamName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "projectName",
                colId: "projectName",
                headerName: "Project Name",
                flex: 1.5,
                minWidth: 160,
                valueGetter: params => params.data?.projectName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "projectCode",
                colId: "projectCode",
                headerName: "Project Code",
                flex: 1.2,
                minWidth: 160,
                valueGetter: params => params.data?.projectCode ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "poNo",
                colId: "poNo",
                headerName: "PO No",
                flex: 1,
                minWidth: 120,
                valueGetter: params => params.data?.poNo ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "poDate",
                colId: "poDate",
                headerName: "PO Date",
                flex: 1,
                minWidth: 130,
                cellRenderer: (params: { data?: MasterProjectListRow }) =>
                    params.data?.poDate ? formatDate(params.data.poDate) : "—",
                sortable: true,
                filter: true,
            },
            {
                field: "sapPoDate",
                colId: "sapPoDate",
                headerName: "SAP PO Date",
                flex: 1,
                minWidth: 130,
                cellRenderer: (params: { data?: MasterProjectListRow }) =>
                    params.data?.sapPoDate ? formatDate(params.data.sapPoDate) : "—",
                sortable: true,
                filter: true,
            },
            {
                field: "organizationName",
                colId: "organizationName",
                headerName: "Organization",
                flex: 1,
                minWidth: 140,
                valueGetter: params => params.data?.organizationName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "itemName",
                colId: "itemName",
                headerName: "Item",
                flex: 1,
                minWidth: 100,
                valueGetter: params => params.data?.itemName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "locationName",
                colId: "locationName",
                headerName: "Location",
                flex: 1,
                minWidth: 100,
                valueGetter: params => params.data?.locationName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                headerName: "Actions",
                filter: false,
                cellRenderer: createActionColumnRenderer(actions),
                sortable: false,
                pinned: "right",
                width: 80,
            },
        ],
        [actions],
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-32" />
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
                    <CardTitle>Projects</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load projects. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Projects</CardTitle>
                        <CardDescription className="mt-2">
                            Manage project master entries
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => navigate(paths.documentDashboard.projectsCreate)}
                        className="bg-orange-500 hover:bg-orange-600"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No projects</p>
                        <p className="text-sm mt-2">
                            Create a project using the button above.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={colDefs as ColDef<any>[]}
                        loading={isLoading}
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
                                '<span style="padding: 10px; text-align: center;">No projects found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default ProjectsListPage;
