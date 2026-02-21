import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Edit, FileX2, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/hooks/useFormatedDate';
import { usePqrs } from '@/hooks/api/usePqrs';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import type { PqrListRow } from '@/modules/shared/pqr/helpers/pqr.types';

const PqrListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const next = event.api
            .getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({ colId: col.colId, sort: col.sort as 'asc' | 'desc' }));
        setSortModel(next);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const { data: apiResponse, isLoading: loading, error } = usePqrs(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const pqrActions: ActionItem<PqrListRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => navigate(paths.documentDashboard.pqrView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.documentDashboard.pqrEdit(row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<PqrListRow>[]>(
        () => [
            {
                field: 'id',
                colId: 'id',
                headerName: 'ID',
                width: 80,
                sortable: true,
                filter: true,
            },
            {
                field: 'teamName',
                colId: 'teamName',
                headerName: 'Team Name',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => params.data?.teamName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project Name',
                flex: 1.5,
                minWidth: 160,
                valueGetter: (params) => params.data?.projectName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'value',
                colId: 'value',
                headerName: 'Value',
                flex: 1,
                minWidth: 100,
                valueGetter: (params) => params.data?.value ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'item',
                colId: 'item',
                headerName: 'Item',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => params.data?.item ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'poDate',
                colId: 'poDate',
                headerName: 'PO Date',
                flex: 1,
                minWidth: 120,
                cellRenderer: (params: { data?: PqrListRow }) =>
                    params.data?.poDate ? formatDate(params.data.poDate) : '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'sapGemPoDate',
                colId: 'sapGemPoDate',
                headerName: 'SAP/GEM PO Date',
                flex: 1,
                minWidth: 130,
                cellRenderer: (params: { data?: PqrListRow }) =>
                    params.data?.sapGemPoDate ? formatDate(params.data.sapGemPoDate) : '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'completionDate',
                colId: 'completionDate',
                headerName: 'Completion Date',
                flex: 1,
                minWidth: 130,
                cellRenderer: (params: { data?: PqrListRow }) =>
                    params.data?.completionDate ? formatDate(params.data.completionDate) : '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'remarks',
                colId: 'remarks',
                headerName: 'Remarks',
                flex: 1.5,
                minWidth: 140,
                valueGetter: (params) => params.data?.remarks ?? '—',
                sortable: true,
                filter: true,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(pqrActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [pqrActions]
    );

    if (loading) {
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
                    <CardTitle>PQR</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load PQR list. Please try again later.
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
                        <CardTitle>PQR</CardTitle>
                        <CardDescription className="mt-2">
                            Manage PQR entries
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => navigate(paths.documentDashboard.pqrCreate)}
                        className="bg-orange-500 hover:bg-orange-600"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create PQR
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
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No PQR entries</p>
                        <p className="text-sm mt-2">
                            Create a PQR entry using the button above.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={colDefs as ColDef<any>[]}
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
                                '<span style="padding: 10px; text-align: center;">No PQR entries found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default PqrListPage;
