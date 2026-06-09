import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Edit, FileX2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useClientDirectories } from '@/hooks/api/useClientDirectory';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import type { ClientDirectoryRow } from '@/modules/shared/client-directory/helpers/client-directory.types';
import { ClientDirectoryModal } from './components/ClientDirectoryModal';

const ClientDirectoryListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalRecordId, setModalRecordId] = useState<number | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

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

    const { data: apiResponse, isLoading: loading, error } = useClientDirectories(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const openModal = useCallback((recordId: number, mode: 'view' | 'edit') => {
        setModalRecordId(recordId);
        setModalMode(mode);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setModalRecordId(null);
    }, []);

    const clientActions: ActionItem<ClientDirectoryRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => openModal(row.id, 'view'),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => openModal(row.id, 'edit'),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [openModal],
    );

    const colDefs = useMemo<ColDef<ClientDirectoryRow>[]>(
        () => [
            {
                field: 'name',
                colId: 'name',
                headerName: 'Name',
                flex: 1.5,
                minWidth: 160,
                valueGetter: (params) => params.data?.name ?? '—',
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
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(clientActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [clientActions],
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
                    <CardTitle>Client Directory</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load client directory. Please try again later.
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
                        <CardTitle>Client Directory</CardTitle>
                        <CardDescription className="mt-2">
                            View and manage client contacts from across the system
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
                            placeholder="Search by name, email, phone, organization..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No contacts found</p>
                        <p className="text-sm mt-2">
                            Contacts will appear here when they are captured from info sheets, physical docs, or follow-ups.
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
                                '<span style="padding: 10px; text-align: center;">No contacts found</span>',
                        }}
                    />
                )}
            </CardContent>

            <ClientDirectoryModal
                open={modalOpen}
                onOpenChange={closeModal}
                recordId={modalRecordId}
                mode={modalMode}
            />
        </Card>
    );
};

export default ClientDirectoryListPage;
