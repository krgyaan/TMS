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
import type { ClientContact, SubmitQueryListRow } from './helpers/submitQueries.types';
import { useSubmitQueries } from '@/hooks/api/useSubmitQuery';
import { Badge } from '@/components/ui/badge';

const SubmitQueryListPage = () => {
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

    const { data: apiResponse, isLoading: loading, error } = useSubmitQueries(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const submitQueryActions: ActionItem<SubmitQueryListRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => navigate(paths.tendering.submitQueryView(row.tenderId, row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.tendering.submitQueryEdit(row.tenderId, row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<SubmitQueryListRow>[]>(
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
                field: 'queries',
                colId: 'queries',
                headerName: 'Query Types',
                flex: 1,
                cellRenderer: (params: { data?: SubmitQueryListRow }) => (
                    params.data?.queries ? (
                        <div className="flex flex-wrap gap-1">
                            {params.data.queries.map((query: any, index: number) => (
                                <Badge key={index} variant="outline" className="h-5 px-1">
                                    {query.queryType}
                                </Badge>
                            ))}
                        </div>
                    ) : '—'
                ),
                sortable: false,
                filter: false,
            },
            {
                field: 'clientContacts',
                colId: 'clientContacts',
                headerName: 'Sent To',
                flex: 1,
                cellRenderer: (params: { data?: SubmitQueryListRow }) => {
                    if (!params.data) return '—';
                    let emails: string[] = [];
                    params.data.clientContacts.forEach((contact: ClientContact) => {
                        if (contact.client_email) {
                            emails.push(contact.client_email.trim());
                        }
                    });

                    return emails.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {emails.map((email: string, index: number) => (
                                <Badge key={index} variant="outline" className="h-5 px-1">
                                    {email}
                                </Badge>
                            ))}
                        </div>
                    ) : '—';
                },
                sortable: false,
                filter: false,

            },
            {
                field: 'createdAt',
                colId: 'createdAt',
                headerName: 'Requested On',
                flex: 1,
                width: 100,
                maxWidth: 150,
                cellRenderer: (params: { data?: SubmitQueryListRow }) =>
                    params.data?.createdAt ? formatDateTime(params.data.createdAt) : '—',
                sortable: true,
                filter: true,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(submitQueryActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [submitQueryActions]
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
                    <CardTitle>Submit Query Against Tender</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load Submitted Query list. Please try again later.
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
                        <CardTitle>Submit Query</CardTitle>
                        <CardDescription className="mt-2">
                            Manage Submit Query entries
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
                        <p className="text-lg font-medium">No Submitted Query entries</p>
                        <p className="text-sm mt-2">
                            Submit a Request entry using the button associated with tender on tender dashboard.
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
                                '<span style="padding: 10px; text-align: center;">No Submitted Query entries found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default SubmitQueryListPage;
