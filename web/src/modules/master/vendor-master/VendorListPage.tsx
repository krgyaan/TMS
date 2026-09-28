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
import { useSetVendorOrganizationStatus, useVendorOrganizationsWithRelations } from "@/hooks/api/useVendorOrganizations";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { VendorOrganizationWithRelations } from "@/types/api.types";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { AlertCircle, Eye, FileText, Pencil, Plus, Power, PowerOff, Search } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { vendorAreaBase } from "./vendorAreaPath";

const PERMISSION_MODULE = "master.vendors";

type VendorRow = VendorOrganizationWithRelations & {
    gstCount: number;
    accountCount: number;
    personCount: number;
    fileCount: number;
};

const toRow = (org: VendorOrganizationWithRelations): VendorRow => ({
    ...org,
    gstCount: org._counts?.gsts ?? org.gsts?.length ?? 0,
    accountCount: org._counts?.accounts ?? org.accounts?.length ?? 0,
    personCount: org._counts?.persons ?? org.persons?.length ?? 0,
    fileCount: org._counts?.files ?? org.files?.length ?? 0,
});

const VendorsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = vendorAreaBase(location.pathname);
    const { data: organizations, isLoading, error, refetch } = useVendorOrganizationsWithRelations();
    const setVendorStatus = useSetVendorOrganizationStatus();
    const { canCreate, canUpdate } = useAuth();

    const {
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState<"all">({
        storageKey: "vendor-master",
        defaultTab: "all",
        defaultPageSize: 25,
    });

    const handleToggleStatus = useCallback(
        async (org: VendorRow) => {
            const next = !org.status;
            const confirmed = window.confirm(
                next
                    ? `Activate "${org.name}"? It will be selectable as a seller in new PO/VWOs.`
                    : `Deactivate "${org.name}"? It will be hidden from new PO/VWO seller selection. Existing records stay intact.`,
            );
            if (!confirmed) return;
            try {
                await setVendorStatus.mutateAsync({ id: org.id, status: next });
            } catch {
                // Error toast handled in the hook
            }
        },
        [setVendorStatus],
    );

    const filteredRows = useMemo(() => {
        const list = (organizations ?? []).map(toRow);
        const q = debouncedSearch.trim().toLowerCase();
        if (!q) return list;

        return list.filter(org => {
            const own = [org.name, org.alias, org.pan, org.msme, org.address];
            const gst = (org.gsts ?? []).flatMap(g => [g.gstNo, g.gstState]);
            const persons = (org.persons ?? []).flatMap(p => [p.name, p.email, p.mobile]);
            const accounts = (org.accounts ?? []).flatMap(a => [a.accountNum, a.ifscCode]);

            return [...own, ...gst, ...persons, ...accounts].some(value =>
                (value ?? "").toLowerCase().includes(q),
            );
        });
    }, [organizations, debouncedSearch]);

    const totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
    const pageIndex = Math.min(pagination.pageIndex, totalPages - 1);
    const pageRows = filteredRows.slice(pageIndex * pagination.pageSize, (pageIndex + 1) * pagination.pageSize);

    const rowActions = useMemo<ActionItem<VendorRow>[]>(
        () => [
            {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: row => navigate(`${basePath}/${row.id}`),
            },
            {
                label: "Edit",
                icon: <Pencil className="h-4 w-4" />,
                onClick: row => navigate(`${basePath}/${row.id}/edit`),
                visible: () => canUpdate(PERMISSION_MODULE),
            },
            {
                label: "Deactivate",
                icon: <PowerOff className="h-4 w-4" />,
                onClick: row => handleToggleStatus(row),
                visible: row => canUpdate(PERMISSION_MODULE) && row.status,
                className: "text-destructive",
            },
            {
                label: "Activate",
                icon: <Power className="h-4 w-4" />,
                onClick: row => handleToggleStatus(row),
                visible: row => canUpdate(PERMISSION_MODULE) && !row.status,
            },
        ],
        [basePath, navigate, canUpdate, handleToggleStatus],
    );

    const columns = useMemo<ColDef<VendorRow>[]>(
        () => [
            { field: "name", headerName: "Organization", sortable: true, filter: true, minWidth: 200 },
            { field: "alias", headerName: "Alias", sortable: true, filter: true, minWidth: 140 },
            { field: "pan", headerName: "PAN", sortable: true, filter: true, minWidth: 120 },
            { field: "msme", headerName: "MSME", sortable: true, filter: true, minWidth: 130 },
            { field: "gstCount", headerName: "GSTs", sortable: true, filter: true, minWidth: 80, width: 80 },
            {
                field: "accountCount",
                headerName: "Accounts",
                sortable: true,
                filter: true,
                minWidth: 100,
                width: 100,
            },
            {
                field: "personCount",
                headerName: "Persons",
                sortable: true,
                filter: true,
                minWidth: 90,
                width: 90,
            },
            { field: "fileCount", headerName: "Files", sortable: true, filter: true, minWidth: 80, width: 80 },
            {
                field: "status",
                headerName: "Status",
                sortable: true,
                filter: true,
                minWidth: 100,
                width: 100,
                cellRenderer: (params: CustomCellRendererProps<VendorRow>) => (
                    <Badge variant={params.value ? "default" : "secondary"}>
                        {params.value ? "Active" : "Inactive"}
                    </Badge>
                ),
            },
            {
                colId: "actions",
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer<VendorRow>(rowActions),
                width: 100,
                pinned: "right",
            },
        ],
        [rowActions],
    );

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
                    <CardTitle>Vendor Organizations</CardTitle>
                    <CardDescription>Manage vendor organizations and their details</CardDescription>
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
                            Vendor Organizations
                            <Badge variant="secondary" className="ml-2">
                                {totalRows} vendor{totalRows !== 1 ? "s" : ""}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Manage vendor organizations, GST numbers, bank accounts, contacts and files.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search name, PAN, GST, contact, account..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {canCreate(PERMISSION_MODULE) && (
                            <Button variant="default" asChild>
                                <Link to={`${basePath}/create`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Organization
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {totalRows === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileText className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No vendors found</p>
                        <p className="text-sm mt-2">
                            {debouncedSearch ? "Try adjusting your search." : "Add your first vendor organization to get started."}
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={pageRows}
                        columnDefs={columns}
                        manualPagination={true}
                        rowCount={totalRows}
                        paginationState={{ pageIndex, pageSize: pagination.pageSize }}
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

export default VendorsPage;
