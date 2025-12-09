import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Calendar, Upload, FileX2, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useRaDashboard } from '@/hooks/api/useReverseAuctions';
import type { RaDashboardRow, RaDashboardType } from '@/types/api.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { useNavigate } from 'react-router-dom';

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
    key: RaDashboardType;
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
    const [activeTab, setActiveTab] = useState<RaDashboardType>('under-evaluation');

    // Fetch data with the active tab filter
    const { data: response, isLoading, error } = useRaDashboard();

    const { data: raData, counts } = response || { data: [], counts: null };

    const handleViewDetails = useCallback((row: RaDashboardRow) => {
        if (row.id) {
            navigate(`/tendering/ras/${row.id}`);
        }
    }, [navigate]);

    const handleScheduleRa = useCallback((row: RaDashboardRow) => {
        navigate(`/tendering/ras/schedule/${row.tenderId}`);
    }, [navigate]);

    const handleUploadResult = useCallback((row: RaDashboardRow) => {
        if (row.id) {
            navigate(`/tendering/ras/upload-result/${row.id}`);
        }
    }, [navigate]);

    const raActions: ActionItem<RaDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                onClick: handleViewDetails,
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Schedule RA',
                onClick: handleScheduleRa,
                icon: <Calendar className="h-4 w-4" />,
                visible: (row) => row.raStatus === RA_STATUS.UNDER_EVALUATION,
            },
            {
                label: 'Upload RA Result',
                onClick: handleUploadResult,
                icon: <Upload className="h-4 w-4" />,
                visible: (row) =>
                    [RA_STATUS.RA_SCHEDULED, RA_STATUS.RA_STARTED, RA_STATUS.RA_ENDED].includes(
                        row.raStatus as any
                    ),
            },
        ],
        [handleViewDetails, handleScheduleRa, handleUploadResult]
    );

    const colDefs = useMemo<ColDef<RaDashboardRow>[]>(
        () => [
            tenderNameCol<RaDashboardRow>('tenderNo', {
                headerName: 'Tender',
                filter: true,
                flex: 2,
                minWidth: 250,
            }),
            {
                field: 'teamMemberName',
                headerName: 'Team Member',
                flex: 1.5,
                minWidth: 150,
                valueGetter: (params) => params.data?.teamMemberName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'bidSubmissionDate',
                headerName: 'Bid Submission',
                flex: 1.5,
                minWidth: 170,
                valueGetter: (params) =>
                    params.data?.bidSubmissionDate
                        ? formatDateTime(params.data.bidSubmissionDate)
                        : '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderValue',
                headerName: 'Tender Value',
                flex: 1,
                minWidth: 130,
                valueGetter: (params) => {
                    const value = params.data?.tenderValue;
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
                valueGetter: (params) => params.data?.itemName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                flex: 1,
                minWidth: 130,
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'raStartTime',
                headerName: 'RA Start Time',
                flex: 1.5,
                minWidth: 170,
                valueGetter: (params) =>
                    params.data?.raStartTime ? formatDateTime(params.data.raStartTime) : '—',
                sortable: true,
                filter: true,
                hide: activeTab === 'under-evaluation',
            },
            {
                field: 'raEndTime',
                headerName: 'RA End Time',
                flex: 1.5,
                minWidth: 170,
                valueGetter: (params) =>
                    params.data?.raEndTime ? formatDateTime(params.data.raEndTime) : '—',
                sortable: true,
                filter: true,
                hide: activeTab === 'under-evaluation',
            },
            {
                field: 'raStatus',
                headerName: 'RA Status',
                flex: 1.2,
                minWidth: 160,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
                },
            },
            {
                field: 'result',
                headerName: 'Result',
                flex: 1,
                minWidth: 100,
                valueGetter: (params) => params.data?.result || '—',
                sortable: true,
                filter: true,
                hide: activeTab !== 'completed',
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(raActions),
                sortable: false,
                pinned: 'right',
                width: 120,
            },
        ],
        [raActions, activeTab]
    );

    const tabsWithData = useMemo(() => {
        return TABS_CONFIG.map((tab) => ({
            ...tab,
            count: getCountForTab(tab, raData, counts),
            data: raData?.filter(tab.filterFn) || [],
        }));
    }, [raData, counts]);

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
                        {counts && (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Total: {counts.total}</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as RaDashboardType)}
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
                            <TabsContent key={tab.key} value={tab.key} className="px-0">
                                {tab.data.length === 0 ? (
                                    <EmptyState
                                        title={`No ${tab.name.toLowerCase()} RAs`}
                                        description={tab.description}
                                    />
                                ) : (
                                    <DataTable
                                        data={tab.data}
                                        columnDefs={colDefs as ColDef<any>[]}
                                        loading={false}
                                        gridOptions={{
                                            defaultColDef: {
                                                editable: false,
                                                filter: true,
                                                sortable: true,
                                                resizable: true,
                                            },
                                            pagination: true,
                                            paginationPageSize: 50,
                                        }}
                                        enablePagination
                                        height="auto"
                                    />
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
