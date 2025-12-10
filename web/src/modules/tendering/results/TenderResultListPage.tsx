import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Upload, FileX2, Gavel, Trophy, XCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useResultDashboard } from '@/hooks/api/useTenderResults';
import type { ResultDashboardRow, ResultDashboardType } from '@/types/api.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { useNavigate } from 'react-router-dom';

const RESULT_STATUS = {
    RESULT_AWAITED: 'Result Awaited',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
    DISQUALIFIED: 'Disqualified',
    UNDER_EVALUATION: 'Under Evaluation',
} as const;

type TabConfig = {
    key: ResultDashboardType;
    name: string;
    icon: React.ReactNode;
    description: string;
    filterFn: (item: ResultDashboardRow) => boolean;
};

const TABS_CONFIG: TabConfig[] = [
    {
        key: 'pending',
        name: 'Result Awaited',
        icon: <Clock className="h-4 w-4" />,
        description: 'Tenders awaiting result declaration',
        filterFn: (item) => item.resultStatus === RESULT_STATUS.RESULT_AWAITED,
    },
    {
        key: 'won',
        name: 'Won',
        icon: <Trophy className="h-4 w-4" />,
        description: 'Tenders that we have won',
        filterFn: (item) => item.resultStatus === RESULT_STATUS.WON,
    },
    {
        key: 'lost',
        name: 'Lost',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Tenders that were lost or disqualified',
        filterFn: (item) =>
            [RESULT_STATUS.LOST, RESULT_STATUS.LOST_H1].includes(
                item.resultStatus as any
            ),
    },
    {
        key: 'disqualified',
        name: 'Disqualified',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Tenders that were disqualified',
        filterFn: (item) => item.resultStatus === RESULT_STATUS.DISQUALIFIED || item.tenderStatus === RESULT_STATUS.DISQUALIFIED,
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

const getEmdStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const upperStatus = status.toUpperCase();

    if (upperStatus.includes('REJECTED')) return 'destructive';
    if (upperStatus.includes('APPROVED') || upperStatus.includes('COMPLETED')) return 'success';
    if (upperStatus.includes('SUBMITTED') || upperStatus.includes('INITIATED')) return 'info';
    if (upperStatus.includes('PENDING')) return 'warning';
    return 'secondary';
};

const getCountForTab = (
    tab: TabConfig,
    data: ResultDashboardRow[] | undefined,
    counts: any
): number => {
    if (counts) {
        switch (tab.key) {
            case 'pending':
                return counts.pending;
            case 'won':
                return counts.won;
            case 'lost':
                return counts.lost;
        }
    }
    return data?.filter(tab.filterFn).length || 0;
};

const TenderResultListPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ResultDashboardType>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab]);

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

    const { data: response, isLoading, error } = useResultDashboard({
        type: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
    });

    const resultData = response?.data || [];
    const counts = response?.counts || null;
    const totalRows = response?.meta?.total || 0;

    const handleViewDetails = useCallback((row: ResultDashboardRow) => {
        if (row.id) {
            navigate(`/tendering/results/${row.id}`);
        }
    }, [navigate]);

    const handleUploadResult = useCallback((row: ResultDashboardRow) => {
        if (row.id) {
            navigate(`/tendering/results/${row.id}/edit`);
        } else {
            // If no result entry exists, navigate to upload page with tenderId
            navigate(`/tendering/results/upload/${row.tenderId}`);
        }
    }, [navigate]);

    const handleViewRa = useCallback((row: ResultDashboardRow) => {
        if (row.reverseAuctionId) {
            navigate(`/tendering/ras/${row.reverseAuctionId}`);
        }
    }, [navigate]);

    const resultActions: ActionItem<ResultDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: handleViewDetails,
            },
            {
                label: 'Upload Result',
                icon: <Upload className="h-4 w-4" />,
                visible: (row) =>
                    (row.resultStatus === RESULT_STATUS.RESULT_AWAITED ||
                        row.resultStatus === RESULT_STATUS.UNDER_EVALUATION) && !row.raApplicable,
                onClick: handleUploadResult,
            },
            {
                label: 'View RA Details',
                icon: <Gavel className="h-4 w-4" />,
                visible: (row) => row.raApplicable && !!row.reverseAuctionId,
                onClick: handleViewRa,
            },
        ],
        [handleViewDetails, handleUploadResult, handleViewRa]
    );

    const colDefs = useMemo<ColDef<ResultDashboardRow>[]>(
        () => [
            tenderNameCol<ResultDashboardRow>('tenderNo', {
                headerName: 'Tender',
                filter: true,
                flex: 2,
                minWidth: 250,
                colId: 'tenderNo',
                sortable: true,
            }),
            {
                field: 'teamExecutiveName',
                headerName: 'Team Executive',
                flex: 1.5,
                minWidth: 150,
                colId: 'teamExecutiveName',
                valueGetter: (params) => params.data?.teamExecutiveName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'bidSubmissionDate',
                headerName: 'Bid Submission',
                flex: 1.5,
                minWidth: 170,
                colId: 'bidSubmissionDate',
                valueGetter: (params) =>
                    params.data?.bidSubmissionDate
                        ? formatDateTime(params.data.bidSubmissionDate)
                        : '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'finalPrice',
                headerName: 'Final Price',
                flex: 1.2,
                minWidth: 140,
                colId: 'finalPrice',
                valueGetter: (params) => {
                    const value = params.data?.finalPrice || params.data?.tenderValue;
                    if (!value) return '—';
                    return formatINR(parseFloat(value));
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'itemName',
                headerName: 'Item',
                flex: 1,
                minWidth: 120,
                colId: 'itemName',
                valueGetter: (params) => params.data?.itemName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                flex: 1,
                minWidth: 130,
                colId: 'tenderStatus',
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'emdDetails',
                headerName: 'EMD',
                flex: 1.3,
                minWidth: 150,
                sortable: false,
                filter: false,
                cellRenderer: (params: any) => {
                    const emd = params.data?.emdDetails;
                    if (!emd) return '—';

                    if (emd.displayText === 'Not Applicable') {
                        return <span className="text-muted-foreground text-sm">N/A</span>;
                    }

                    if (emd.displayText === 'Not Requested') {
                        return (
                            <Badge variant="outline" className="text-xs">
                                Not Requested
                            </Badge>
                        );
                    }

                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant={getEmdStatusVariant(emd.instrumentStatus) as any}
                                    className="text-xs w-fit"
                                >
                                    {emd.amount}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs space-y-1">
                                    <p>Amount: {formatINR(parseFloat(emd.amount))}</p>
                                    <p>{emd.displayText}</p>
                                    <p>Status: {emd.instrumentStatus || 'N/A'}</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                },
            },
            {
                field: 'resultStatus',
                headerName: 'Result',
                flex: 1.2,
                minWidth: 150,
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
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(resultActions),
                sortable: false,
                pinned: 'right',
                width: 120,
            },
        ],
        [resultActions]
    );

    const tabsWithData = useMemo(() => {
        return TABS_CONFIG.map((tab) => ({
            ...tab,
            count: getCountForTab(tab, resultData, counts),
        }));
    }, [resultData, counts]);

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
                        {counts && (
                            <div className="flex gap-4 text-sm">
                                <StatBadge
                                    label="Won"
                                    count={counts.won}
                                    variant="success"
                                    icon={<Trophy className="h-3 w-3" />}
                                />
                                <StatBadge
                                    label="Lost"
                                    count={counts.lost}
                                    variant="destructive"
                                    icon={<XCircle className="h-3 w-3" />}
                                />
                                <StatBadge
                                    label="Pending"
                                    count={counts.pending}
                                    variant="secondary"
                                    icon={<Clock className="h-3 w-3" />}
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as ResultDashboardType)}
                    >
                        <TabsList className="m-auto">
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

                        {tabsWithData.map((tab) => (
                            <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
                                {activeTab === tab.key && (
                                    <>
                                        {(!resultData || resultData.length === 0) ? (
                                            <EmptyState
                                                title={`No ${tab.name.toLowerCase()} results`}
                                                description={tab.description}
                                            />
                                        ) : (
                                            <DataTable
                                                data={resultData}
                                                columnDefs={colDefs as ColDef<any>[]}
                                                loading={isLoading}
                                                manualPagination={true}
                                                rowCount={totalRows}
                                                paginationState={pagination}
                                                onPaginationChange={setPagination}
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

const StatBadge = ({
    label,
    count,
    variant,
    icon,
}: {
    label: string;
    count: number;
    variant: string;
    icon: React.ReactNode;
}) => (
    <div className="flex items-center gap-1.5">
        <Badge variant={variant as any} className="gap-1">
            {icon}
            {count}
        </Badge>
        <span className="text-muted-foreground text-xs">{label}</span>
    </div>
);

export default TenderResultListPage;
