import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Upload, Gavel, Trophy, XCircle, Eye, FileX2, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useResultDashboard, useResultDashboardCounts } from '@/hooks/api/useTenderResults';
import type { ResultDashboardRow, ResultDashboardType } from '@/modules/tendering/results/helpers/tenderResult.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';
import { ChangeStatusModal } from '../tenders/components/ChangeStatusModal';

const RESULT_STATUS = {
    RESULT_AWAITED: 'Result Awaited',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
    DISQUALIFIED: 'Disqualified',
    UNDER_EVALUATION: 'Under Evaluation',
} as const;


const TABS_CONFIG: Array<{ key: ResultDashboardType; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'result-awaited',
        name: 'Result Awaited',
        icon: <Clock className="h-4 w-4" />,
        description: 'Tenders awaiting result declaration',
    },
    {
        key: 'won',
        name: 'Won',
        icon: <Trophy className="h-4 w-4" />,
        description: 'Tenders that we have won',
    },
    {
        key: 'lost',
        name: 'Lost',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Tenders that were lost or disqualified',
    },
    {
        key: 'disqualified',
        name: 'Disqualified',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Tenders that were disqualified',
    }
];

const getStatusVariant = (status: string): string => {
    switch (status) {
        case RESULT_STATUS.RESULT_AWAITED:
            return 'secondary';
        case RESULT_STATUS.WON:
            return 'success';
        case RESULT_STATUS.LOST:
        case RESULT_STATUS.LOST_H1:
        case RESULT_STATUS.DISQUALIFIED:
            return 'destructive';
        default:
            return 'secondary';
    }
};

const TenderResultListPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ResultDashboardType>('result-awaited');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
        open: false,
        tenderId: null
    });

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

    const { data: apiResponse, isLoading, error } = useResultDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
    });

    const { data: counts } = useResultDashboardCounts();

    const resultData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const resultActions: ActionItem<ResultDashboardRow>[] = useMemo(
        () => [
            {
                label: 'Change Status',
                icon: <RefreshCw className="h-4 w-4" />,
                onClick: (row: ResultDashboardRow) => setChangeStatusModal({ open: true, tenderId: row.tenderId }),
            },
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: ResultDashboardRow) => navigate(paths.tendering.resultsShow(row.tenderId)),
            },
            {
                label: 'Upload Result',
                icon: <Upload className="h-4 w-4" />,
                onClick: (row: ResultDashboardRow) => row.id ? navigate(paths.tendering.resultsEdit(row.id)) : navigate(paths.tendering.resultsUpload(row.tenderId)),
            },
            {
                label: 'View RA Details',
                icon: <Gavel className="h-4 w-4" />,
                onClick: (row: ResultDashboardRow) => navigate(paths.tendering.rasShow(row.reverseAuctionId!)),
                visible: (row) => row.raApplicable && !!row.reverseAuctionId,
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<ResultDashboardRow>[]>(
        () => [
            tenderNameCol<ResultDashboardRow>('tenderNo', {
                headerName: 'Tender',
                filter: true,
                width: 250,
                colId: 'tenderNo',
                sortable: true,
            }),
            {
                field: 'teamExecutiveName',
                headerName: 'Member',
                width: 150,
                colId: 'teamExecutiveName',
                valueGetter: (params) => params.data?.teamExecutiveName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'bidSubmissionDate',
                headerName: 'Bid Submission',
                width: 150,
                colId: 'bidSubmissionDate',
                cellRenderer: (params: any) =>
                    params.data?.bidSubmissionDate
                        ? formatDateTime(params.data.bidSubmissionDate)
                        : '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'finalPrice',
                headerName: 'Final Price',
                width: 120,
                colId: 'finalPrice',
                cellRenderer: (params: any) => {
                    const value = params.data?.finalPrice || params.data?.tenderValue;
                    if (!value) return '—';
                    return formatINR(parseFloat(value));
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                width: 150,
                colId: 'tenderStatus',
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'emdDetails',
                headerName: 'EMD Details',
                width: 150,
                colId: 'emdDetails',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const emd = params.data?.emdDetails;
                    if (!emd) return '—';

                    if (emd.displayText === 'Not Applicable') {
                        return (
                            <Badge variant="secondary" className="text-xs">
                                {emd.displayText}
                            </Badge>
                        );
                    }

                    if (emd.displayText === 'Not Requested') {
                        return (
                            <Badge variant="outline" className="text-xs">
                                {emd.displayText}
                            </Badge>
                        );
                    }

                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant='success'
                                    className="text-xs w-fit"
                                >
                                    {formatINR(parseFloat(emd.amount))}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs space-y-1">
                                    <p>Amount: {formatINR(parseFloat(emd.amount))}</p>
                                    <p>{emd.displayText}</p>
                                    <p>Status: {emd.instrumentStatus || '—'}</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                },
            },
            {
                field: 'resultStatus',
                headerName: 'Result',
                width: 150,
                colId: 'resultStatus',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
                },
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(resultActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [resultActions]
    );

    const tabsWithData = useMemo(() => {
        return TABS_CONFIG.map((tab) => {
            let count = 0;
            if (counts) {
                switch (tab.key) {
                    case 'result-awaited':
                        count = counts.pending ?? 0;
                        break;
                    case 'won':
                        count = counts.won ?? 0;
                        break;
                    case 'lost':
                        count = counts.lost ?? 0;
                        break;
                    case 'disqualified':
                        count = counts.disqualified ?? 0;
                        break;
                }
            }
            return {
                ...tab,
                count,
            };
        });
    }, [counts]);

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
                                <Skeleton key={i} className="h-10 w-36" />
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
                    <CardTitle>Tender Results Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load tender results. Please try again later.
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
                            <CardTitle>Tender Results Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage tender results after bid submission.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as ResultDashboardType)}
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
                                    {tab.count > 0 && (
                                        <Badge variant="secondary" className="text-xs ml-1">
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
                            ]}
                                value={search}
                                onChange={(value) => setSearch(value)}
                            />
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
                                        {(!resultData || resultData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} tender</p>
                                                <p className="text-sm mt-2">
                                                    {tab.key === 'result-awaited'
                                                        ? 'Tenders requiring result declaration will appear here'
                                                        : 'Tender results will be shown here'}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={resultData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No results found</span>',
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
            <ChangeStatusModal
                open={changeStatusModal.open}
                onOpenChange={(open) => setChangeStatusModal({ ...changeStatusModal, open })}
                tenderId={changeStatusModal.tenderId}
                currentStatus={changeStatusModal.currentStatus}
                onSuccess={() => {
                    setChangeStatusModal({ open: false, tenderId: null });
                }}
            />
        </>
    );
};

export default TenderResultListPage;
