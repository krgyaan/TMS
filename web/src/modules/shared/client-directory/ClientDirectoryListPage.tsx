import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ColDef, SortChangedEvent } from 'ag-grid-community';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Edit, FileX2, Search, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClientDirectories, useSyncAllClientDirectory } from '@/hooks/api/useClientDirectory';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import type { ClientDirectoryRow } from '@/modules/shared/client-directory/helpers/client-directory.types';
import { ClientDirectoryModal } from '@/modules/shared/client-directory/components/ClientDirectoryModal';
import { ClientDirectoryViewModal } from '@/modules/shared/client-directory/components/ClientDirectoryViewModal';

const ClientDirectoryListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);

    const syncMutation = useSyncAllClientDirectory();

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch]);

    const handleSortChanged = useCallback((event: SortChangedEvent<ClientDirectoryRow>) => {
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

    const { data: apiResponse, isLoading: loading, error, refetch } = useClientDirectories(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const [modalState, setModalState] = useState<{ open: boolean; recordId: number | null }>({
        open: false,
        recordId: null,
    });
    const [viewState, setViewState] = useState<{ open: boolean; record: ClientDirectoryRow | null }>({
        open: false,
        record: null,
    });

    const clientActions: ActionItem<ClientDirectoryRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => setViewState({ open: true, record: row }),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => setModalState({ open: true, recordId: row.id }),
                icon: <Edit className="h-4 w-4" />,
            },
        ],
        [],
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
                colId: 'address',
                headerName: 'Address (Personal/Official)',
                flex: 1.8,
                minWidth: 200,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
                valueGetter: (params) => {
                    const address = params.data?.address;
                    return [address?.personal, address?.official].filter(Boolean).join(' | ');
                },
                cellRenderer: (params: CustomCellRendererProps<ClientDirectoryRow>) => {
                    const address = params.data?.address;
                    if (!address?.personal && !address?.official) {
                        return <span className="text-muted-foreground">—</span>;
                    }
                    const firstAddress = address.personal || address.official;
                    return (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-help text-xs truncate block w-full">
                                        {firstAddress}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-2 w-fit max-w-xs">
                                    <div className="flex flex-col gap-1 text-[10px]">
                                        <div className="flex items-center gap-1 font-bold text-white border-b border-border/50 pb-0.5">
                                            Address Details
                                        </div>
                                        {address.personal && (
                                            <p>
                                                <span className="text-white">Personal:</span> {address.personal}
                                            </p>
                                        )}
                                        {address.official && (
                                            <p>
                                                <span className="text-white">Official:</span> {address.official}
                                            </p>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                },
                sortable: false,
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
                field: 'giftingTier',
                colId: 'giftingTier',
                headerName: 'Gifting Tier',
                width: 110,
                valueGetter: (params) => params.data?.giftingTier ?? '—',
                cellRenderer: (params: CustomCellRendererProps<ClientDirectoryRow>) => {
                    const tier = params.data?.giftingTier;
                    return tier
                        ? <Badge variant="secondary">{tier}</Badge>
                        : <span className="text-muted-foreground">—</span>;
                },
                sortable: true,
                filter: true,
            },
            {
                colId: 'remarks',
                headerName: 'Remarks',
                flex: 1.5,
                minWidth: 160,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
                valueGetter: (params) => {
                    const remarks = params.data?.remarks ?? [];
                    return remarks.map((r) => r.text).join(' | ');
                },
                cellRenderer: (params: CustomCellRendererProps<ClientDirectoryRow>) => {
                    const remarks = params.data?.remarks ?? [];
                    if (remarks.length === 0) {
                        return <span className="text-muted-foreground">—</span>;
                    }
                    const lastRemark = remarks[remarks.length - 1].text;
                    return (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-help text-xs truncate block w-full">
                                        {lastRemark}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-2 w-fit max-w-xs">
                                    <div className="flex flex-col gap-1 text-[10px]">
                                        <div className="flex items-center gap-1 font-bold text-white border-b border-border/50 pb-0.5">
                                            All Remarks ({remarks.length})
                                        </div>
                                        {remarks.map((remark, i) => (
                                            <p key={i}>
                                                <span className="text-white">{i + 1}.</span> {remark.text}
                                            </p>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                },
                sortable: false,
                filter: true,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(clientActions),
                sortable: false,
                pinned: 'right',
                width: 100,
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
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Client Directory</CardTitle>
                            <CardDescription className="mt-2">
                                View and manage client contacts from across the system
                            </CardDescription>
                        </div>
                        <Button onClick={() => setModalState({ open: true, recordId: null })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Contact
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="flex justify-between items-center gap-4 px-6 pb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isPending}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                            {syncMutation.isPending ? 'Syncing...' : 'Sync All Contacts'}
                        </Button>
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
                        <DataTable<ClientDirectoryRow>
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
                                    '<span style="padding: 10px; text-align: center;">No contacts found</span>',
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            <ClientDirectoryModal
                open={modalState.open}
                onOpenChange={(open) => setModalState((s) => ({ ...s, open }))}
                recordId={modalState.recordId}
                onSuccess={refetch}
            />

            <ClientDirectoryViewModal
                open={viewState.open}
                onOpenChange={(open) => setViewState((s) => ({ ...s, open }))}
                record={viewState.record}
            />
        </>
    );
};

export default ClientDirectoryListPage;