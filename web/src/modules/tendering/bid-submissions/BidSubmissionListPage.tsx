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
import { AlertCircle, Send, XCircle, Eye, Edit, FileX2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useBidSubmissions, useBidSubmissionsDashboardCounts, type BidSubmissionDashboardRow } from '@/hooks/api/useBidSubmissions';
import { tenderNameCol } from '@/components/data-grid/columns';

type TabKey = 'pending' | 'submitted' | 'disqualified' | 'tender-dnb';

const BidSubmissionListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const navigate = useNavigate();

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

    const { data: apiResponse, isLoading: loading, error } = useBidSubmissions(
        activeTab as TabKey,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize },
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

    const bidSubmissionActions: ActionItem<BidSubmissionDashboardRow>[] = useMemo(() => [
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
                navigate(paths.tendering.bidView(row.bidSubmissionId!));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ], [navigate]);

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

    const colDefs = useMemo<ColDef<BidSubmissionDashboardRow>[]>(() => [
        tenderNameCol<BidSubmissionDashboardRow>('tenderNo', {
            headerName: 'Tender',
            filter: true,
            flex: 2,
            minWidth: 250,
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
            headerName: 'Due Date & Time',
            flex: 1.5,
            minWidth: 170,
            valueGetter: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'emdAmount',
            headerName: 'EMD',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
                const value = params.data?.emdAmount;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'gstValues',
            colId: 'gstValues',
            headerName: 'Tender Value',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
                const value = params.data?.gstValues;
                if (value === null || value === undefined) return '—';
                return formatINR(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'finalCosting',
            colId: 'finalCosting',
            headerName: 'Final Costing',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
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
            minWidth: 140,
            sortable: true,
            filter: true,
            valueGetter: (params: any) => {
                const value = params.data?.statusName;
                if (!value) return '—';
                return value;
            },
        },
        {
            field: 'bidStatus',
            headerName: 'Status',
            flex: 1,
            minWidth: 140,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant={getStatusVariant(status) as 'secondary' | 'destructive' | 'default' | 'outline'}>
                        {status}
                    </Badge>
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
                    <TabsList className="m-auto">
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
        </Card>
    );
};

export default BidSubmissionListPage;
