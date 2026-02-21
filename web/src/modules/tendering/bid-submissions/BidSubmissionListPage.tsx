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
import { AlertCircle, Send, XCircle, Eye, Edit, FileX2, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useBidSubmissions, useBidSubmissionsDashboardCounts, type BidSubmissionDashboardRow } from '@/hooks/api/useBidSubmissions';
import { tenderNameCol } from '@/components/data-grid/columns';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';
import type { BidSubmissionDashboardRowWithTimer } from './helpers/bidSubmission.types';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';
import { ChangeStatusModal } from '../tenders/components/ChangeStatusModal';

type TabKey = 'pending' | 'submitted' | 'disqualified' | 'tender-dnb';

const BidSubmissionListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('pending');
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

    const { data: apiResponse, isLoading: loading, error } = useBidSubmissions(
        activeTab as TabKey,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const { data: counts } = useBidSubmissionsDashboardCounts();

    const bidSubmissionsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Submission Pending':
                return 'secondary';
            case 'Bid Submitted':
                return 'success';
            case 'Tender Missed':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const bidSubmissionActions: ActionItem<BidSubmissionDashboardRowWithTimer>[] = useMemo(() => [
        {
            label: 'Change Status',
            onClick: (row: BidSubmissionDashboardRow) => setChangeStatusModal({ open: true, tenderId: row.tenderId }),
            icon: <RefreshCw className="h-4 w-4" />,
        },
        {
            label: 'Submit Bid',
            onClick: (row: BidSubmissionDashboardRow) => {
                navigate(paths.tendering.bidSubmit(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.bidStatus === 'Submission Pending',
        },
        {
            label: 'Mark as Missed',
            onClick: (row: BidSubmissionDashboardRow) => {
                navigate(paths.tendering.bidMarkMissed(row.tenderId));
            },
            icon: <XCircle className="h-4 w-4" />,
            visible: (row) => row.bidStatus === 'Submission Pending',
        },
        {
            label: 'Edit Bid',
            onClick: (row: BidSubmissionDashboardRow) => {
                navigate(paths.tendering.bidEdit(row.bidSubmissionId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.bidStatus === 'Bid Submitted' && row.bidSubmissionId !== null,
        },
        {
            label: 'Edit Missed',
            onClick: (row: BidSubmissionDashboardRow) => {
                navigate(paths.tendering.bidEditMissed(row.bidSubmissionId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.bidStatus === 'Tender Missed' && row.bidSubmissionId !== null,
        },
        {
            label: 'View Details',
            onClick: (row: BidSubmissionDashboardRow) => {
                navigate(paths.tendering.bidView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ], [navigate, setChangeStatusModal]);

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'pending' as TabKey,
                name: 'Bid Submission Pending',
                count: counts?.pending ?? 0,
            },
            {
                key: 'submitted' as TabKey,
                name: 'Bid Submitted',
                count: counts?.submitted ?? 0,
            },
            {
                key: 'disqualified' as TabKey,
                name: 'Disqualified',
                count: counts?.disqualified ?? 0,
            },
            {
                key: 'tender-dnb' as TabKey,
                name: 'Tender DNB',
                count: counts?.['tender-dnb'] ?? 0,
            },
        ];
    }, [counts]);

    const colDefs = useMemo<ColDef<BidSubmissionDashboardRowWithTimer>[]>(() => [
        tenderNameCol<BidSubmissionDashboardRow>('tenderNo', {
            headerName: 'Tender',
            filter: true,
            width: 200,
        }),
        {
            field: 'teamMemberName',
            colId: 'teamMemberName',
            headerName: 'Team Member',
            width: 130,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            colId: 'dueDate',
            headerName: 'Due Date & Time',
            width: 160,
            cellRenderer: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'emdAmount',
            colId: 'emdAmount',
            headerName: 'EMD',
            width: 120,
            cellRenderer: (params: any) => {
                const value = params.data?.emdAmount;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'finalCosting',
            colId: 'finalCosting',
            headerName: 'Final Costing',
            width: 130,
            cellRenderer: (params: any) => {
                const value = params.data?.finalCosting;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            colId: 'statusName',
            headerName: 'Tender Status',
            width: 140,
            valueGetter: (params: any) => {
                const value = params.data?.statusName;
                if (!value) return '—';
                return value;
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'bidStatus',
            headerName: 'Status',
            width: 170,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant={getStatusVariant(status) as 'secondary' | 'destructive' | 'default' | 'outline'}>
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
            width: 110,
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
            cellRenderer: createActionColumnRenderer(bidSubmissionActions),
            sortable: false,
            pinned: 'right',
            width: 80,
        },
    ], [bidSubmissionActions]);

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
                    <CardTitle>Bid Submissions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load bid submissions. Please try again later.
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
                        <CardTitle>Bid Submissions</CardTitle>
                        <CardDescription className="mt-2">
                            Submit bids for tenders with approved costing sheets.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
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
                                    {bidSubmissionsData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} bids</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending' && 'Tenders with approved costings will appear here for bid submission'}
                                                {tab.key === 'submitted' && 'Submitted bids will be shown here'}
                                                {tab.key === 'disqualified' && 'Disqualified bids will appear here'}
                                                {tab.key === 'tender-dnb' && 'Tender DNB bids will appear here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={bidSubmissionsData}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No bid submissions found</span>',
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

export default BidSubmissionListPage;
