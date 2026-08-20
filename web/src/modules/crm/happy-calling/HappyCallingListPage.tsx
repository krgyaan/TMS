import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ColDef, SortChangedEvent } from 'ag-grid-community';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Edit, PhoneCall, FileX2, Search, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useHappyCallings } from '@/hooks/api/useHappyCalling';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { formatDate } from '@/hooks/useFormatedDate';
import type { HappyCallingRow } from '@/modules/crm/happy-calling/helpers/happy-calling.types';
import { paths } from '@/app/routes/paths';

const HappyCallingListPage = () => {
    const navigate = useNavigate();
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch]);

    const handleSortChanged = useCallback((event: SortChangedEvent<HappyCallingRow>) => {
        const next = event.api
            .getColumnState()
            .filter((col) => col.sort)
            .map((col) => ({ colId: col.colId, sort: col.sort as 'asc' | 'desc' }));
        setSortModel(next);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const { data: apiResponse, isLoading: loading, error } = useHappyCallings(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const actions: ActionItem<HappyCallingRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => navigate(paths.crm.happyCallingView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.crm.happyCallingEdit(row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
            {
                label: 'Followup',
                onClick: (row) => navigate(paths.crm.happyCallingFollowup(row.id)),
                icon: <PhoneCall className="h-4 w-4" />,
            },
            {
                label: 'Enquiry Received',
                onClick: (row) => navigate(paths.crm.happyCallingEnquiryCreate(row.id)),
                icon: <Mail className="h-4 w-4" />,
            },
        ],
        [navigate],
    );

    const colDefs = useMemo<ColDef<HappyCallingRow>[]>(
        () => [
            {
                field: 'organization',
                colId: 'organization',
                headerName: 'Organization',
                flex: 1.5,
                minWidth: 160,
                valueGetter: (params) => params.data?.organization ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'name',
                colId: 'name',
                headerName: 'Name',
                flex: 1.2,
                minWidth: 140,
                valueGetter: (params) => params.data?.name ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'designation',
                colId: 'designation',
                headerName: 'Designation',
                flex: 1.2,
                minWidth: 140,
                valueGetter: (params) => params.data?.designation ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'email',
                colId: 'email',
                headerName: 'Email',
                flex: 1.5,
                minWidth: 180,
                valueGetter: (params) => params.data?.email ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'phone',
                colId: 'phone',
                headerName: 'Phone',
                flex: 1,
                minWidth: 130,
                valueGetter: (params) => params.data?.phone ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'date',
                colId: 'date',
                headerName: 'Date',
                width: 150,
                valueGetter: (params) => formatDate(params.data?.date ?? null),
                sortable: true,
                filter: true,
            },
            {
                field: 'nextFollowupDate',
                colId: 'nextFollowupDate',
                headerName: 'Next Follow Up Date',
                width: 170,
                valueGetter: (params) => formatDate(params.data?.nextFollowupDate ?? null),
                sortable: true,
                filter: true,
            },
            {
                field: 'status',
                colId: 'status',
                headerName: 'Status',
                width: 110,
                valueGetter: (params) => params.data?.status ?? '—',
                cellRenderer: (params: CustomCellRendererProps<HappyCallingRow>) => {
                    const status = params.data?.status;
                    if (!status) return <span className="text-muted-foreground">—</span>;
                    const label = status.charAt(0).toUpperCase() + status.slice(1);
                    return (
                        <Badge variant={status === 'done' ? 'default' : 'secondary'}>
                            {label}
                        </Badge>
                    );
                },
                sortable: true,
                filter: true,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(actions),
                sortable: false,
                pinned: 'right',
                width: 110,
            },
        ],
        [actions],
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
                    <CardTitle>Happy Calling</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load happy calling entries. Please try again later.
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
                            <CardTitle>Happy Calling</CardTitle>
                            <CardDescription className="mt-2">
                                Track calls and follow-ups with clients
                            </CardDescription>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by name, organization, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                            <FileX2 className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No entries found</p>
                            <p className="text-sm mt-2">
                                Happy calling entries will appear here once they are recorded.
                            </p>
                        </div>
                    ) : (
                        <DataTable<HappyCallingRow>
                            data={rows}
                            columnDefs={colDefs}
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
                                    '<span style="padding: 10px; text-align: center;">No entries found</span>',
                            }}
                        />
                    )}
                </CardContent>
            </Card>
    );
};

export default HappyCallingListPage;