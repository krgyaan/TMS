import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle, Eye, Edit, FileX2, ExternalLink, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useCostingApprovals, useCostingApprovalsDashboardCounts } from '@/hooks/api/useCostingApprovals';
import type { CostingApprovalDashboardRow, CostingApprovalDashboardRowWithTimer, CostingApprovalTab } from '@/modules/tendering/costing-approvals/helpers/costingApproval.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';
import { ChangeStatusModal } from '../tenders/components/ChangeStatusModal';

const CostingApprovalListPage = () => {
    const [activeTab, setActiveTab] = useState<CostingApprovalTab>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();
    const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
        open: false,
        tenderId: null
    });

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

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

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const { data: apiResponse, isLoading: loading, error } = useCostingApprovals(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const { data: counts } = useCostingApprovalsDashboardCounts();

    const costingApprovalsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const costingApprovalActions: ActionItem<CostingApprovalDashboardRowWithTimer>[] = useMemo(() => [
        {
            label: 'Approve Costing',
            onClick: (row: CostingApprovalDashboardRow) => {
                navigate(paths.tendering.costingApprove(row.costingSheetId!));
            },
            icon: <CheckCircle className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Submitted',
        },
        {
            label: 'Reject Costing',
            onClick: (row: CostingApprovalDashboardRow) => {
                navigate(paths.tendering.costingReject(row.costingSheetId!));
            },
            icon: <XCircle className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Submitted',
        },
        {
            label: 'Edit Approval',
            onClick: (row: CostingApprovalDashboardRow) => {
                navigate(paths.tendering.costingEditApproval(row.costingSheetId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Approved',
        },
        {
            label: 'View Details',
            onClick: (row: CostingApprovalDashboardRow) => {
                navigate(paths.tendering.costingApprovalView(row.costingSheetId!));
            },
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Change Status",
            onClick: (row: CostingApprovalDashboardRow) => setChangeStatusModal({ open: true, tenderId: row.tenderId, currentStatus: undefined }),
            icon: <RefreshCw className="h-4 w-4" />,
        },
    ], [navigate]);

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'pending' as CostingApprovalTab,
                name: 'Pending Approval',
                count: counts?.pending ?? 0,
            },
            {
                key: 'approved' as CostingApprovalTab,
                name: 'Approved',
                count: counts?.approved ?? 0,
            },
            {
                key: 'tender-dnb' as CostingApprovalTab,
                name: 'Tender DNB',
                count: counts?.['tender-dnb'] ?? 0,
            },
        ];
    }, [counts]);

    const colDefs = useMemo<ColDef<CostingApprovalDashboardRowWithTimer>[]>(() => [
        tenderNameCol<CostingApprovalDashboardRowWithTimer>('tenderNo', {
            headerName: 'Tender',
            filter: true,
            flex: 2,
            minWidth: 200,
        }),
        {
            field: 'teamMemberName',
            colId: 'teamMemberName',
            headerName: 'Team Member',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            colId: 'dueDate',
            headerName: 'Due Date',
            flex: 1.5,
            minWidth: 150,
            cellRenderer: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'emdAmount',
            colId: 'emdAmount',
            headerName: 'EMD',
            flex: 1,
            minWidth: 100,
            cellRenderer: (params: any) => {
                const value = params.data?.emdAmount;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Tender Status',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => params.data?.statusName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'submittedFinalPrice',
            colId: 'submittedFinalPrice',
            headerName: 'TE Final Price',
            flex: 1,
            minWidth: 130,
            cellRenderer: (params: any) => {
                const value = params.data?.submittedFinalPrice;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'costingStatus',
            colId: 'costingStatus',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant={status === 'Submitted' ? 'default' : status === 'Approved' ? 'secondary' : 'destructive'}>
                        {status}
                    </Badge>
                );
            },
        },
        {
            field: 'googleSheetUrl',
            headerName: 'Sheet',
            width: 80,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                const url = params.value;
                if (!url) return '—';
                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                );
            },
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
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(costingApprovalActions),
            sortable: false,
            pinned: 'right',
            width: 80,
        },
    ], [costingApprovalActions]);

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
                    <CardTitle>Costing Approvals</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load costing approvals. Please try again later.
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
                        <CardTitle>Costing Approvals (TL)</CardTitle>
                        <CardDescription className="mt-2">
                            Review and approve costing sheets submitted by your team.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CostingApprovalTab)}>
                    <TabsList className="m-auto mb-4">
                        {tabsConfig.map((tab) => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="data-[state=active]:shadow-md flex items-center gap-1"
                            >
                                <span className="font-semibold text-sm">{tab.name}</span>
                                {tab.count > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {tab.count}
                                    </Badge>
                                )}
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
                                    {costingApprovalsData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} costing sheets</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending' && 'Pending costing sheets will appear here for approval'}
                                                {tab.key === 'approved' && 'Approved costing sheets will be shown here'}
                                                {tab.key === 'tender-dnb' && 'Tender DNB costing sheets will appear here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={costingApprovalsData}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No costing sheets found</span>',
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

export default CostingApprovalListPage;
