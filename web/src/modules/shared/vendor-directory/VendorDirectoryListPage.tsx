import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorOrganizationsPaginated } from "@/hooks/api/useVendorOrganizations";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { VendorOrganizationListItem } from "@/types/api.types";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { AlertCircle, Eye, FileText, Search, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MsmeBadge } from "@/modules/master/vendor-master/helpers/MsmeBadge";
import { paths } from "@/app/routes/paths";

const PERMISSION_MODULE = "document-dashboard.vendors";
const ADMIN_PERMISSION_MODULE = "master.vendors";

type VendorDirectoryRow = VendorOrganizationListItem & {
    gstCount: number;
    accountCount: number;
    personCount: number;
    fileCount: number;
};

const toRow = (org: VendorOrganizationListItem): VendorDirectoryRow => ({
    ...org,
    gstCount: org._counts.gsts,
    accountCount: org._counts.accounts,
    personCount: org._counts.persons,
    fileCount: org._counts.files,
});

const VendorDirectoryListPage = () => {
    const navigate = useNavigate();
    const { canRead } = useAuth();

    const {
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState<"all">({
        storageKey: "vendor-directory",
        defaultTab: "all",
        defaultPageSize: 50,
    });

    const { data: response, isLoading, isFetching, error, refetch } = useVendorOrganizationsPaginated({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
    });

    const pageRows = useMemo(() => (response?.data ?? []).map(toRow), [response]);
    const totalRows = response?.meta?.total ?? 0;
    const totalPages = response?.meta?.totalPages ?? 1;

    // Guard against a stale page index (rows removed while sitting on the last page).
    useEffect(() => {
        if (!response) return;
        const lastPage = Math.max(1, totalPages);
        if (pagination.pageIndex + 1 > lastPage) {
            setPagination({ ...pagination, pageIndex: lastPage - 1 });
        }
    }, [response, totalPages, pagination, setPagination]);

    const rowActions = useMemo<ActionItem<VendorDirectoryRow>[]>(
        () => [
            {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: row => navigate(paths.documentDashboard.vendorsView(row.id)),
            },
        ],
        [navigate],
    );

    const columns = useMemo<ColDef<VendorDirectoryRow>[]>(
        () => [
            { field: "name", headerName: "Organization", sortable: true, filter: true, minWidth: 200 },
            { field: "alias", headerName: "Alias", sortable: true, filter: true, minWidth: 140 },
            { field: "pan", headerName: "PAN", sortable: true, filter: true, minWidth: 120 },
            { field: "msme", headerName: "MSME", sortable: true, filter: true, minWidth: 130 },
            { field: "gstCount", headerName: "GSTs", sortable: true, filter: true, minWidth: 80, width: 80 },
            { field: "accountCount", headerName: "Accounts", sortable: true, filter: true, minWidth: 100, width: 100 },
            { field: "personCount", headerName: "Persons", sortable: true, filter: true, minWidth: 90, width: 90 },
            { field: "fileCount", headerName: "Files", sortable: true, filter: true, minWidth: 80, width: 80 },
            {
                field: "msmeType",
                headerName: "MSME Type",
                sortable: true,
                filter: true,
                minWidth: 130,
                width: 130,
                cellRenderer: (params: CustomCellRendererProps<VendorDirectoryRow>) => (
                    <MsmeBadge msme={params.data?.msme} msmeType={params.data?.msmeType} />
                ),
            },
            {
                colId: "actions",
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer<VendorDirectoryRow>(rowActions),
                width: 100,
                pinned: "right",
            },
        ],
        [rowActions],
    );

    const canView = canRead(PERMISSION_MODULE) || canRead(ADMIN_PERMISSION_MODULE);

    const handleSearchChanged = useCallback((value: string) => setSearch(value), [setSearch]);

    if (!canView) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to view the vendor directory.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Directory</CardTitle>
                    <CardDescription>Read-only view of all vendor organizations</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            Error loading vendor organizations: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle>
                            Vendor Directory
                            <Badge variant="secondary" className="ml-2">
                                {totalRows} vendor{totalRows !== 1 ? "s" : ""}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Read-only directory of vendor organizations, GST numbers, bank accounts, contacts and files.
                        </CardDescription>
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search name, PAN, GST, contact, account..."
                            value={search}
                            onChange={e => handleSearchChanged(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {totalRows === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileText className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No vendors found</p>
                        <p className="text-sm mt-2">
                            {debouncedSearch ? "Try adjusting your search." : "No vendor organizations have been added yet."}
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={pageRows}
                        columnDefs={columns}
                        loading={isFetching}
                        manualPagination={true}
                        rowCount={totalRows}
                        paginationState={pagination}
                        onPaginationChange={setPagination}
                        onPageSizeChange={handlePageSizeChange}
                        showTotalCount={true}
                        showLengthChange={true}
                        gridOptions={{
                            onSortChanged: handleSortChanged,
                        }}
                        enableFiltering={true}
                        enableSorting={true}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default VendorDirectoryListPage;
