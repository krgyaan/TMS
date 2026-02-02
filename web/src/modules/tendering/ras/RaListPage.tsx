import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Calendar, Upload, FileX2, Clock, CheckCircle2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useReverseAuctionDashboard, useReverseAuctionDashboardCounts } from '@/hooks/api/useReverseAuctions';
import type { RaDashboardRow, RaDashboardTab } from '@/modules/tendering/ras/helpers/reverseAuction.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';

const RA_STATUS = {
    UNDER_EVALUATION: 'Under Evaluation',
    RA_SCHEDULED: 'RA Scheduled',
    DISQUALIFIED: 'Disqualified',
    RA_STARTED: 'RA Started',
    RA_ENDED: 'RA Ended',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
} as const;

type TabConfig = {
    key: RaDashboardTab;
    name: string;
    icon: React.ReactNode;
    description: string;
    filterFn: (item: RaDashboardRow) => boolean;
};

const TABS_CONFIG: TabConfig[] = [
    {
        key: 'under-evaluation',
        name: 'Under Evaluation',
        icon: <Clock className="h-4 w-4" />,
        description: 'Tenders awaiting technical qualification',
        filterFn: (item) => item.raStatus === RA_STATUS.UNDER_EVALUATION,
    },
    {
        key: 'scheduled',
        name: 'Scheduled',
        icon: <Calendar className="h-4 w-4" />,
        description: 'RAs that are scheduled, started, or ended',
        filterFn: (item) =>
            [RA_STATUS.RA_SCHEDULED, RA_STATUS.RA_STARTED, RA_STATUS.RA_ENDED].includes(
                item.raStatus as any
            ),
    },
    {
        key: 'completed',
        name: 'Completed',
        icon: <CheckCircle2 className="h-4 w-4" />,
        description: 'RAs with final results',
        filterFn: (item) =>
            [RA_STATUS.WON, RA_STATUS.LOST, RA_STATUS.LOST_H1, RA_STATUS.DISQUALIFIED].includes(
                item.raStatus as any
            ),
    },
];

const getStatusVariant = (status: string): string => {
    switch (status) {
        case RA_STATUS.UNDER_EVALUATION:
            return 'secondary';
        case RA_STATUS.RA_SCHEDULED:
            return 'info';
        case RA_STATUS.RA_STARTED:
            return 'warning';
        case RA_STATUS.RA_ENDED:
            return 'outline';
        case RA_STATUS.WON:
            return 'success';
        case RA_STATUS.LOST:
        case RA_STATUS.LOST_H1:
        case RA_STATUS.DISQUALIFIED:
            return 'destructive';
        default:
            return 'secondary';
    }
};

const getCountForTab = (
    tab: TabConfig,
    data: RaDashboardRow[] | undefined,
    counts: any
): number => {
    if (counts) {
        switch (tab.key) {
            case 'under-evaluation':
                return counts.underEvaluation;
            case 'scheduled':
                return counts.scheduled;
            case 'completed':
                return counts.completed;
        }
    }
    return data?.filter(tab.filterFn).length || 0;
};

const ReverseAuctionListPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<RaDashboardTab>('under-evaluation');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);

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

    // Fetch data with the active tab filter
    const { data: response, isLoading, error } = useReverseAuctionDashboard({
        tabKey: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
    });

    const { data: counts } = useReverseAuctionDashboardCounts();

    const raData = response?.data || [];
    const totalRows = response?.meta?.total || raData.length;

    const raActions: ActionItem<RaDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                onClick: (row: RaDashboardRow) => navigate(paths.tendering.rasShow(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Schedule RA',
                onClick: (row: RaDashboardRow) => navigate(paths.tendering.rasSchedule(row.tenderId)),
                icon: <Calendar className="h-4 w-4" />,
                visible: (row) => row.raStatus === RA_STATUS.UNDER_EVALUATION,
            },
            {
                label: 'Upload RA Result',
                onClick: (row: RaDashboardRow) => navigate(paths.tendering.rasUploadResult(row.id)),
                icon: <Upload className="h-4 w-4" />,
                visible: (row) =>
                    [RA_STATUS.RA_SCHEDULED, RA_STATUS.RA_STARTED, RA_STATUS.RA_ENDED].includes(
                        row.raStatus as any
                    ),
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<RaDashboardRow>[]>(
        () => [
            tenderNameCol<RaDashboardRow>('tenderNo', {
                headerName: 'Tender',
                filter: true,
                width: 200,
            }),
            {
                field: 'teamMemberName',
                headerName: 'Team Member',
                width: 130,
                valueGetter: (params) => params.data?.teamMemberName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderValue',
                colId: 'tenderValue',
                headerName: 'Tender Value',
                width: 130,
                valueGetter: (params) => {
                    const value = params.data?.tenderValue;
                    if (!value) return '—';
                    return formatINR(parseFloat(value));
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderStatus',
                colId: 'tenderStatus',
                headerName: 'Tender Status',
                width: 150,
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'bidSubmissionDate',
                colId: 'bidSubmissionDate',
                headerName: 'Bid Submission',
                width: 150,
                valueGetter: (params) =>
                    params.data?.bidSubmissionDate
                        ? formatDateTime(params.data.bidSubmissionDate)
                        : '—',
                sortable: true,
                filter: true,
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
            },
            {
                field: 'raStartTime',
                colId: 'raStartTime',
                headerName: 'RA Start Time',
                width: 150,
                valueGetter: (params) =>
                    params.data?.raStartTime ? formatDateTime(params.data.raStartTime) : '—',
                sortable: true,
                filter: true,
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
            },
            {
                field: 'raEndTime',
                colId: 'raEndTime',
                headerName: 'RA End Time',
                width: 150,
                valueGetter: (params) =>
                    params.data?.raEndTime ? formatDateTime(params.data.raEndTime) : '—',
                sortable: true,
                filter: true,
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
            },
            {
                field: 'raStatus',
                colId: 'raStatus',
                headerName: 'RA Status',
                width: 130,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
                },
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(raActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [raActions, activeTab]
    );

    const tabsWithData = useMemo(() => {
        return TABS_CONFIG.map((tab) => ({
            ...tab,
            count: activeTab === tab.key ? totalRows : (counts ? getCountForTab(tab, [], counts) : 0),
        }));
    }, [activeTab, totalRows, counts]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {TABS_CONFIG.map((_, i) => (
                                <Skeleton key={i} className="h-10 w-40" />
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
                    <CardTitle>Reverse Auction Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load reverse auctions. Please try again later.
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
                            <CardTitle>Reverse Auction Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Manage reverse auctions for tenders with RA applicable.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as RaDashboardTab)}
                    >
                        <TabsList className="m-auto mb-4">
                            {tabsWithData.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:shadow-md flex items-center gap-2"
                                >
                                    {tab.icon}
                                    <span className="font-semibold text-sm">{tab.name}</span>
                                    <Badge variant="secondary" className="text-xs ml-1">
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

                        {tabsWithData.map((tab) => (
                            <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
                                {activeTab === tab.key && (
                                    <>
                                        {(!raData || raData.length === 0) ? (
                                            <EmptyState
                                                title={`No ${tab.name.toLowerCase()} RAs`}
                                                description={tab.description}
                                            />
                                        ) : (
                                            <DataTable
                                                data={raData}
                                                columnDefs={colDefs as ColDef<any>[]}
                                                loading={isLoading}
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
                                                        resizable: true,
                                                    },
                                                    onSortChanged: handleSortChanged,
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No reverse auctions found</span>',
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </>
    );
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileX2 className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{title}</p>
        <p className="text-sm mt-2">{description}</p>
    </div>
);

export default ReverseAuctionListPage;
