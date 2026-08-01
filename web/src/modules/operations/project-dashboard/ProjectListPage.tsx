import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Search, LayoutDashboard, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { paths } from "@/app/routes/paths";
import { useProjectMasters } from "@/hooks/api/useProjectMaster";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { formatDate } from "@/hooks/useFormatedDate";
import type { ProjectMasterListRow } from "@/modules/shared/master-project/helpers/projectMaster.types";

const IconAction: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon: Icon, label, onClick, disabled }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onClick();
                    }}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed",
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
                {label}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export default function ProjectListPage() {
    const {
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: "project-list",
        defaultTab: "default",
    });

    const navigate = useNavigate();

    const { data: apiResponse, isLoading, error } = useProjectMasters(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const colDefs = useMemo<ColDef<ProjectMasterListRow>[]>(
        () => [
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
                flex: 1,
                minWidth: 120,
                valueGetter: params => params.data?.projectCode ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "poNo",
                colId: "poNo",
                headerName: "PO No",
                flex: 1,
                minWidth: 100,
                valueGetter: params => params.data?.poNo ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "poDate",
                colId: "poDate",
                headerName: "PO Date",
                flex: 1,
                minWidth: 120,
                valueGetter: params => params.data?.poDate ? formatDate(params.data.poDate) : "—",
                sortable: true,
                filter: true,
            },
            {
                field: "teamName",
                colId: "teamName",
                headerName: "Team",
                flex: 1,
                minWidth: 100,
                valueGetter: params => params.data?.teamName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                headerName: "",
                width: 110,
                sortable: false,
                filter: false,
                pinned: "right",
                cellRenderer: (params: CustomCellRendererProps<ProjectMasterListRow>) => {
                    const row = params.data as ProjectMasterListRow | undefined; if (!row) return null;
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <IconAction
                                icon={LayoutDashboard}
                                label="Open Dashboard"
                                onClick={() => navigate(paths.operations.projectDashboard(row.id))}
                            />
                            <IconAction
                                icon={Eye}
                                label="View Details"
                                onClick={() => navigate(paths.operations.projectShowPage(row.id))}
                            />
                        </div>
                    );
                },
            },
        ],
        [navigate],
    );

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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Projects</CardTitle>
                            <CardDescription className="mt-2">
                                Select a project to open its dashboard or view full details.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search projects..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {isLoading ? (
                        <div className="p-6">
                            <Skeleton className="h-10 w-full mb-2" />
                            <Skeleton className="h-10 w-full mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                            <FileText className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No projects</p>
                            <p className="text-sm mt-2">
                                {search ? "Try adjusting your search." : "No projects are available."}
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            data={rows}
                            columnDefs={colDefs as ColDef<ProjectMasterListRow>[]}
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
        </div>
    );
}
