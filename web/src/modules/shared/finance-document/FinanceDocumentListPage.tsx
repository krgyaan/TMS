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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFinanceDocuments } from '@/hooks/api/useFinanceDocuments';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import type { FinanceDocumentListRow } from '@/modules/shared/finance-document/helpers/financeDocument.types';
import { useFinancialYears } from '@/hooks/api/useFinancialYear';
import { useFinanceDocTypes } from '@/hooks/api/useFinanceDocType';

const FinanceDocumentListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    const { data: financialYears = [] } = useFinancialYears();
    const { data: financeDocTypes = [] } = useFinanceDocTypes();

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

    const { data: apiResponse, isLoading: loading, error } = useFinanceDocuments(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const financialYearMap = useMemo(
        () =>
            Object.fromEntries(
                financialYears.map((fy) => [String(fy.id), fy.name] as const)
            ),
        [financialYears]
    );

    const financeDocTypeMap = useMemo(
        () =>
            Object.fromEntries(
                financeDocTypes.map((dt) => [String(dt.id), dt.name] as const)
            ),
        [financeDocTypes]
    );

    const financeDocumentActions: ActionItem<FinanceDocumentListRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => navigate(paths.documentDashboard.financeDocumentView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.documentDashboard.financeDocumentEdit(row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<FinanceDocumentListRow>[]>(
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
                field: 'documentName',
                colId: 'documentName',
                headerName: 'Document Name',
                flex: 1.5,
                minWidth: 180,
                valueGetter: (params) => params.data?.documentName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'documentType',
                colId: 'documentType',
                headerName: 'Document Type',
                flex: 1,
                minWidth: 130,
                valueGetter: (params) => {
                    const raw = params.data?.documentType;
                    if (!raw) return '—';
                    return financeDocTypeMap[raw] ?? '—';
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'financialYear',
                colId: 'financialYear',
                headerName: 'Financial Year',
                flex: 1,
                minWidth: 120,
                valueGetter: (params) => {
                    const raw = params.data?.financialYear;
                    if (!raw) return '—';
                    return financialYearMap[raw] ?? '—';
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'uploadFile',
                colId: 'uploadFile',
                headerName: 'Document',
                flex: 1,
                minWidth: 120,
                cellRenderer: (params: { data?: FinanceDocumentListRow }) => {
                    const url = params.data?.uploadFile;
                    if (!url) return '—';
                    return (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Document
                        </a>
                    );
                },
                sortable: false,
                filter: false,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(financeDocumentActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [financeDocumentActions, financialYearMap, financeDocTypeMap]
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
                    <CardTitle>Finance Documents</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load finance documents. Please try again later.
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
                        <CardTitle>Finance Documents</CardTitle>
                        <CardDescription className="mt-2">
                            Manage finance documents
                        </CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.documentDashboard.financeDocumentCreate)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Finance Document
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
                        <p className="text-lg font-medium">No finance documents</p>
                        <p className="text-sm mt-2">
                            Create a finance document using the button above.
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
                                '<span style="padding: 10px; text-align: center;">No finance documents found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default FinanceDocumentListPage;
