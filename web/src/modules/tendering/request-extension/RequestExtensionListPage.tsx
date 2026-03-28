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
import { AlertCircle, Eye, Edit, FileX2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useRequestExtensions } from '@/hooks/api/useRequestExtension';
import type { RequestExtensionListRow } from './helpers/requestExtension.types';

const RequestExtensionListPage = () => {
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

    const { data: apiResponse, isLoading: loading, error } = useRequestExtensions(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const requestExtensionActions: ActionItem<RequestExtensionListRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => navigate(paths.tendering.requestExtensionView(row.tenderId, row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.tendering.requestExtensionEdit(row.tenderId, row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<RequestExtensionListRow>[]>(
        () => [
            {
                field: 'tenderName',
                colId: 'tenderName',
                headerName: 'Tender Name',
                flex: 1,
                width: 100,
                maxWidth: 160,
                valueGetter: (params) => params.data?.tenderName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderNo',
                colId: 'tenderNo',
                headerName: 'Tender No.',
                flex: 1.5,
                width: 100,
                maxWidth: 160,
                valueGetter: (params) => params.data?.tenderNo ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'days',
                colId: 'days',
                headerName: 'Days of Extension',
                flex: 1,
                width: 90,
                maxWidth: 120,
                valueGetter: (params) => params.data?.days ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'reason',
                colId: 'reason',
                headerName: 'Reason for Extension',
                flex: 1,
                width: 250,
                valueGetter: (params) => params.data?.reason ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'createdAt',
                colId: 'createdAt',
                headerName: 'Requested On',
                flex: 1,
                width: 100,
                maxWidth: 150,
                cellRenderer: (params: { data?: RequestExtensionListRow }) =>
                    params.data?.createdAt ? formatDateTime(params.data.createdAt) : '—',
                sortable: true,
                filter: true,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(requestExtensionActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [requestExtensionActions]
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
                    <CardTitle>Request Extension</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load Request Extension list. Please try again later.
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
                        <CardTitle>Request Extension</CardTitle>
                        <CardDescription className="mt-2">
                            Manage Request Extension entries
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="flex justify-between items-center gap-4 px-6 pb-4">
                    <div></div>
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
                        <p className="text-lg font-medium">No Extension Request entries</p>
                        <p className="text-sm mt-2">
                            Create a Request Extension entry using the button associated with tender on tender dashboard.
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
                                '<span style="padding: 10px; text-align: center;">No Request Extension entries found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default RequestExtensionListPage;
