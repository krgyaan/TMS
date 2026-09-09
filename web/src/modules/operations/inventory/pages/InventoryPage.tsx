import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Eye, FileText, LayoutDashboard, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useInventoryProjectSummaries } from "@/hooks/api/useInventory";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import type { InventoryProjectSummary } from "../helpers/inventory.types";
import { InventorySection } from "../components/InventorySection";
import type { ColDef } from "ag-grid-community";

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

function ProjectSummariesView() {
    const navigate = useNavigate();
    const {
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: "inventory-projects",
        defaultTab: "default",
        defaultPageSize: 50,
    });

    const { data: apiResponse, isLoading, error } = useInventoryProjectSummaries({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
    });

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const colDefs = useMemo<ColDef<InventoryProjectSummary>[]>(
        () => [
            {
                field: "projectName",
                colId: "projectName",
                headerName: "Project Name",
                width: 250,
                valueGetter: params => params.data?.projectName ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "projectCode",
                colId: "projectCode",
                headerName: "Project Code",
                width: 250,
                valueGetter: params => params.data?.projectCode ?? "—",
                sortable: true,
                filter: true,
            },
            {
                field: "approvedPoCount",
                colId: "approvedPoCount",
                headerName: "Approved PO",
                width: 150,
                valueGetter: params => params.data?.approvedPoCount ?? 0,
            },
            {
                field: "approvedVwoCount",
                colId: "approvedVwoCount",
                headerName: "Approved VWO",
                width: 150,
                valueGetter: params => params.data?.approvedVwoCount ?? 0,
            },
            {
                field: "totalItems",
                colId: "totalItems",
                headerName: "Total Items",
                width: 150,
                valueGetter: params => params.data?.totalItems ?? 0,
            },
            {
                headerName: "",
                width: 120,
                sortable: false,
                filter: false,
                pinned: "right",
                cellRenderer: (params: CustomCellRendererProps<InventoryProjectSummary>) => {
                    const row = params.data;
                    if (!row) return null;
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <IconAction
                                icon={LayoutDashboard}
                                label="Open Inventory"
                                onClick={() => navigate(paths.operations.inventoryProject(row.projectId))}
                            />
                            <IconAction
                                icon={Eye}
                                label="View Project Details"
                                onClick={() => navigate(paths.operations.projectShowPage(row.projectId))}
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
                    <CardTitle>All Inventory</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load inventory. Please try again later.
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
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle>
                                All Inventory
                                <Badge variant="secondary" className="ml-2">
                                    {totalRows} project{totalRows !== 1 ? "s" : ""}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Project-wise inventory across all projects.
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
                            <p className="text-lg font-medium">No inventory</p>
                            <p className="text-sm mt-2">
                                {search ? "Try adjusting your search." : "No projects with inventory are available."}
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            data={rows}
                            columnDefs={colDefs}
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
                                    sortable: false,
                                    resizable: true,
                                },
                                overlayNoRowsTemplate:
                                    '<span style="padding: 10px; text-align: center;">No inventory found</span>',
                            }}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ProjectInventoryView({ projectId }: { projectId: number }) {
    const navigate = useNavigate();
    const { data: overview } = useProjectOverview(projectId);
    const projectName = overview?.project?.projectName ?? `Project #${projectId}`;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                Inventory — {projectName}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Items in stock for this project.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => navigate(paths.operations.inventory)}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            All Inventories
                        </Button>
                    </div>
                </CardHeader>
            </Card>
            <InventorySection projectId={projectId} />
        </div>
    );
}

export default function InventoryPage() {
    const [searchParams] = useSearchParams();
    const projectIdParam = searchParams.get("projectId");
    const projectId = projectIdParam ? Number(projectIdParam) : null;

    if (projectId) {
        return <ProjectInventoryView projectId={projectId} />;
    }
    return <ProjectSummariesView />;
}