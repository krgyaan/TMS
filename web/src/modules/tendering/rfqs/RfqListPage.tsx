import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import type { RfqDashboardRowWithTimer } from '@/modules/tendering/rfqs/helpers/rfq.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, FileX2, Trash2, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRfqsDashboard, useRfqsDashboardCounts, useDeleteRfq } from '@/hooks/api/useRfqs';
import { dateCol, tenderNameCol } from '@/components/data-grid';
import { Input } from '@/components/ui/input';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';
import { ChangeStatusModal } from '../tenders/components/ChangeStatusModal';

const Rfqs = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb'>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
        open: false,
        tenderId: null
    });
    const navigate = useNavigate();

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api.getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc'
            }));
        setSortModel(sortModel);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    const { data: apiResponse, isLoading: loading, error } = useRfqsDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
    });

    const { data: counts } = useRfqsDashboardCounts();

    const rfqsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const deleteMutation = useDeleteRfq();

    const rfqsActions: ActionItem<RfqDashboardRowWithTimer>[] = [
        {
            label: 'Change Status',
            onClick: (row: RfqDashboardRowWithTimer) => setChangeStatusModal({ open: true, tenderId: row.tenderId }),
            icon: <RefreshCw className="h-4 w-4" />,
        },
        {
            label: 'Send',
            onClick: (row: RfqDashboardRowWithTimer) => navigate(paths.tendering.rfqsCreate(row.tenderId)),
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: RfqDashboardRowWithTimer) => {
                navigate(paths.tendering.rfqsView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Delete',
            onClick: (row: RfqDashboardRowWithTimer) => {
                if (row.rfqId && confirm('Are you sure you want to delete this RFQ?')) {
                    deleteMutation.mutate(row.rfqId);
                }
            },
            icon: <Trash2 className="h-4 w-4" />,
            // show: (row: RfqDashboardRowWithTimer) => row.rfqId !== null,
        },
    ];

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'pending' as const,
                name: 'RFQ Pending',
                count: counts?.pending ?? 0,
            },
            {
                key: 'sent' as const,
                name: 'RFQ Sent',
                count: counts?.sent ?? 0,
            },
            {
                key: 'rfq-rejected' as const,
                name: 'RFQ Rejected',
                count: counts?.['rfq-rejected'] ?? 0,
            },
            {
                key: 'tender-dnb' as const,
                name: 'Tender DNB',
                count: counts?.['tender-dnb'] ?? 0,
            },
        ];
    }, [counts]);

    const colDefs = useMemo<ColDef<RfqDashboardRowWithTimer>[]>(() => [
        tenderNameCol<RfqDashboardRowWithTimer>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'teamMemberName',
            headerName: 'Team Member',
            width: 150,
            colId: 'teamMemberName',
            valueGetter: (params: any) => params.data?.teamMemberName ? params.data.teamMemberName : '—',
            sortable: true,
            filter: true,
        },
        dateCol<RfqDashboardRowWithTimer>('dueDate', {
            headerName: 'Due Date',
            width: 150,
            colId: 'dueDate',
        }),
        {
            field: 'rfqCount',
            headerName: 'Total RFQs',
            width: 120,
            colId: 'rfqCount',
            cellRenderer: (params: any) => {
                const { data } = params;
                const count = data?.rfqCount ?? 0;
                return (
                    <Badge variant="outline">
                        {count} sent
                    </Badge>
                );
            },
            visible: activeTab === 'sent',
            sortable: true,
            filter: true,
        },
        {
            field: 'vendorOrganizationNames',
            headerName: 'Vendor',
            width: 150,
            colId: 'vendorOrganizationNames',
            valueGetter: (params) => {
                const names = params.data?.vendorOrganizationNames;
                if (!names) return '—';

                return names;
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Tender Status',
            width: 200,
            colId: 'statusName',
            valueGetter: (params: any) => params.data?.statusName ? params.data.statusName : '—',
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant="default">
                        {status}
                    </Badge>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'timer',
            headerName: 'Timer',
            width: 150,
            cellRenderer: (params: any) => {
                const { data } = params;
                const timer = data?.timer;

                if (!timer) {
                    return <TenderTimerDisplay
                        remainingSeconds={0}
                        status="NOT_STARTED"
                    />;
                }

                return (
                    <TenderTimerDisplay
                        remainingSeconds={timer.remainingSeconds}
                        status={timer.status}
                    />
                );
            },
        },
        {
            headerName: '',
            filter: false,
            cellRenderer: createActionColumnRenderer(rfqsActions),
            sortable: false,
            pinned: 'right',
            width: 57,
        },
    ], [rfqsActions]);

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
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-24 flex-1" />
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
                    <CardTitle>RFQs</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load RFQs. Please try again later.
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
                        <CardTitle>RFQs</CardTitle>
                        <CardDescription className="mt-2">
                            Review and approve RFQs.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb')}>
                    <TabsList className="m-auto mb-4">
                        {tabsConfig.map((tab) => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="data-[state=active]:shadow-md flex items-center gap-1"
                            >
                                <span className="font-semibold text-sm">{tab.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                    {tab.count}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Search Row: Quick Filters, Search Bar, Sort Filter */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        {/* Quick Filters (Left) */}
                        <QuickFilter options={[
                            { label: 'This Week', value: 'this-week' },
                            { label: 'This Month', value: 'this-month' },
                            { label: 'This Year', value: 'this-year' },
                        ]} value={search} onChange={(value) => setSearch(value)} />

                        {/* Search Bar (Center) - Flex grow */}
                        <div className="flex-1 flex justify-end">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-64"
                                />
                            </div>
                        </div>

                    </div>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0 m-0 data-[state=inactive]:hidden"
                        >
                            {activeTab === tab.key && (
                                <>
                                    {(!rfqsData || rfqsData.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} RFQs</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending'
                                                    ? 'Tenders requiring RFQs will appear here'
                                                    : tab.key === 'sent'
                                                        ? 'Sent RFQs will be shown here'
                                                        : tab.key === 'rfq-rejected'
                                                            ? 'Rejected RFQs will be shown here'
                                                            : 'Tender DNB RFQs will be shown here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={rfqsData}
                                            columnDefs={colDefs as ColDef<any>[]}
                                            loading={loading}
                                            manualPagination={true}
                                            rowCount={totalRows}
                                            paginationState={pagination}
                                            onPaginationChange={setPagination}
                                            onPageSizeChange={handlePageSizeChange}
                                            showTotalCount={true}
                                            showLengthChange={true}
                                            gridOptions={{
                                                defaultColDef: {
                                                    editable: false,
                                                    filter: true,
                                                    sortable: true,
                                                    resizable: true
                                                },
                                                onSortChanged: handleSortChanged,
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No RFQs found</span>',
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
            <ChangeStatusModal
                open={changeStatusModal.open}
                onOpenChange={(open) => setChangeStatusModal({ ...changeStatusModal, open })}
                tenderId={changeStatusModal.tenderId}
                currentStatus={changeStatusModal.currentStatus}
                onSuccess={() => {
                    setChangeStatusModal({ open: false, tenderId: null });
                }}
            />
        </Card>
    );
};

export default Rfqs;
