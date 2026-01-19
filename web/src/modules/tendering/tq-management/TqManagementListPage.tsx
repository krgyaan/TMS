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
import { AlertCircle, Send, XCircle, Eye, Edit, FileX2, CheckCircle, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useTqManagement, useMarkAsNoTq, useTqManagementDashboardCounts, useTqQualified } from '@/hooks/api/useTqManagement';
import { tenderNameCol } from '@/components/data-grid/columns';
import QualificationDialog from './components/QualificationDialog';
import type { TabKey, TqManagementDashboardRow, TqManagementDashboardRowWithTimer } from './helpers/tqManagement.types';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';


const TqManagementListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('awaited');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [noTqDialogOpen, setNoTqDialogOpen] = useState(false);
    const [tqQualifiedDialogOpen, setTqQualifiedDialogOpen] = useState(false);
    const [pendingTenderId, setPendingTenderId] = useState<number | null>(null);
    const [pendingTqId, setPendingTqId] = useState<number | null>(null);
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

    // Fetch paginated data for active tab using tabKey
    const { data: apiResponse, isLoading: loading, error } = useTqManagement(
        activeTab,
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        }
    );

    const { data: counts } = useTqManagementDashboardCounts();

    const tqManagementData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;
    const markNoTqMutation = useMarkAsNoTq();
    const tqQualifiedMutation = useTqQualified();

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'TQ awaited':
                return 'secondary';
            case 'TQ received':
                return 'default';
            case 'TQ replied':
                return 'success';
            case 'Disqualified, TQ missed':
                return 'destructive';
            case 'TQ replied, Qualified':
                return 'success';
            case 'Qualified, No TQ received':
                return 'outline';
            case 'Disqualified, No TQ received':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const handleMarkAsNoTq = (tenderId: number) => {
        setPendingTenderId(tenderId);
        setNoTqDialogOpen(true);
    };

    const handleNoTqConfirm = async (qualified: boolean) => {
        if (pendingTenderId !== null) {
            await markNoTqMutation.mutateAsync({ tenderId: pendingTenderId, qualified });
            setPendingTenderId(null);
        }
    };

    const handleTqQualified = (tqId: number) => {
        setPendingTqId(tqId);
        setTqQualifiedDialogOpen(true);
    };

    const handleTqQualifiedConfirm = async (qualified: boolean) => {
        if (pendingTqId !== null) {
            await tqQualifiedMutation.mutateAsync({ tqId: pendingTqId, qualified });
            setPendingTqId(null);
        }
    };

    const tqManagementActions: ActionItem<TqManagementDashboardRowWithTimer>[] = useMemo(() => [
        {
            label: 'TQ Received',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqReceived(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ awaited',
        },
        {
            label: 'Mark as No TQ',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                handleMarkAsNoTq(row.tenderId);
            },
            icon: <CheckCircle className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ awaited',
        },
        {
            label: 'TQ Replied',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqReplied(row.tqId!));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ received' && row.tqId !== null,
        },
        {
            label: 'TQ Missed',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqMissed(row.tqId!));
            },
            icon: <XCircle className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ received' && row.tqId !== null,
        },
        {
            label: 'Edit TQ Received',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqEditReceived(row.tqId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ received' && row.tqId !== null,
        },
        {
            label: 'Edit TQ Reply',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqEditReplied(row.tqId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ replied' && row.tqId !== null,
        },
        {
            label: 'Edit TQ Missed',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqEditMissed(row.tqId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'Disqualified, TQ missed' && row.tqId !== null,
        },
        {
            label: 'View Details',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqView(row.tqId!));
            },
            icon: <Eye className="h-4 w-4" />,
            visible: (row) => row.tqId !== null,
        },
        {
            label: 'View All TQs',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                navigate(paths.tendering.tqViewAll(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
            visible: (row) => row.tqCount > 1,
        },
        {
            label: 'TQ Qualified',
            onClick: (row: TqManagementDashboardRowWithTimer) => {
                handleTqQualified(row.tqId!);
            },
            icon: <FileCheck className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ replied' && row.tqId !== null,
        },
    ], [navigate, markNoTqMutation, handleTqQualified]);

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'awaited' as TabKey,
                name: 'TQ Awaited',
                count: counts?.awaited ?? 0,
            },
            {
                key: 'received' as TabKey,
                name: 'TQ Received',
                count: counts?.received ?? 0,
            },
            {
                key: 'replied' as TabKey,
                name: 'TQ Replied',
                count: counts?.replied ?? 0,
            },
            {
                key: 'qualified' as TabKey,
                name: 'Qualified',
                count: counts?.qualified ?? 0,
            },
            {
                key: 'disqualified' as TabKey,
                name: 'Disqualified',
                count: counts?.disqualified ?? 0,
            },
        ];
    }, [counts]);

    const colDefs = useMemo<ColDef<TqManagementDashboardRowWithTimer>[]>(() => [
        tenderNameCol<TqManagementDashboardRowWithTimer>('tenderNo', {
            headerName: 'Tender',
            filter: true,
            width: 200,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'teamMemberName',
            headerName: 'Team Member',
            width: 150,
            colId: 'teamMemberName',
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'bidSubmissionDate',
            headerName: 'Bid Submission',
            width: 150,
            colId: 'bidSubmissionDate',
            valueGetter: (params: any) => params.data?.bidSubmissionDate ? formatDateTime(params.data.bidSubmissionDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Tender Status',
            width: 150,
            colId: 'statusName',
            valueGetter: (params: any) => params.data?.statusName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'tqSubmissionDeadline',
            headerName: 'TQ Deadline',
            width: 150,
            colId: 'tqSubmissionDeadline',
            valueGetter: (params: any) => params.data?.tqSubmissionDeadline ? formatDateTime(params.data.tqSubmissionDeadline) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'tqStatus',
            headerName: 'TQ Status',
            width: 180,
            colId: 'tqStatus',
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant={getStatusVariant(status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                        {status}
                    </Badge>
                );
            },
        },
        {
            field: 'tqCount',
            headerName: 'TQ Count',
            width: 120,
            colId: 'tqCount',
            valueGetter: (params: any) => params.data?.tqCount || 0,
            sortable: true,
            cellRenderer: (params: any) => {
                const count = params.value;
                if (count > 0) {
                    return <Badge variant="outline">{count}</Badge>;
                }
                return count;
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
            cellRenderer: createActionColumnRenderer(tqManagementActions),
            sortable: false,
            pinned: 'right',
            width: 80,
        },
    ], [tqManagementActions]);

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
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-24" />
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
                    <CardTitle>TQ Management</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load TQ management data. Please try again later.
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
                        <CardTitle>TQ Management</CardTitle>
                        <CardDescription className="mt-2">
                            Manage technical queries for submitted bids.
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
                                    {(!tqManagementData || tqManagementData.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} TQs</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'awaited' && 'Submitted bids awaiting TQ will appear here'}
                                                {tab.key === 'received' && 'Received TQs will be shown here'}
                                                {tab.key === 'replied' && 'Replied TQs will appear here'}
                                                {tab.key === 'qualified' && 'Qualified tenders (with or without TQ) will appear here'}
                                                {tab.key === 'disqualified' && 'Disqualified tenders (with or without TQ) will appear here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={tqManagementData}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No TQs found</span>',
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
            <QualificationDialog
                open={noTqDialogOpen}
                onOpenChange={setNoTqDialogOpen}
                onConfirm={handleNoTqConfirm}
                title="Mark as No TQ"
                description="This tender did not receive any technical queries. Please select whether it is Qualified or Disqualified."
            />
            <QualificationDialog
                open={tqQualifiedDialogOpen}
                onOpenChange={setTqQualifiedDialogOpen}
                onConfirm={handleTqQualifiedConfirm}
                title="Mark TQ as Qualified"
                description="This technical query has been replied. Please select whether the tender is Qualified or Disqualified."
            />
        </Card>
    );
};

export default TqManagementListPage;
