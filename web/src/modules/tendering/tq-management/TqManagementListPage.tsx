import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Send, XCircle, Eye, Edit, FileX2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useTqManagement, type TqManagementDashboardRow, useMarkAsNoTq } from '@/hooks/api/useTqManagement';
import { tenderNameCol } from '@/components/data-grid/columns';

type TabKey = 'awaited' | 'received' | 'replied' | 'missed' | 'noTq';

const TqManagementListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('awaited');
    const navigate = useNavigate();

    const { data: tqManagementData, isLoading: loading, error } = useTqManagement();
    const markNoTqMutation = useMarkAsNoTq();

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'TQ awaited':
                return 'secondary';
            case 'TQ received':
                return 'default';
            case 'TQ replied':
                return 'success';
            case 'TQ missed':
                return 'destructive';
            case 'No TQ':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const handleMarkAsNoTq = async (tenderId: number) => {
        if (window.confirm('Are you sure you want to mark this as No TQ?')) {
            await markNoTqMutation.mutateAsync(tenderId);
        }
    };

    const tqManagementActions: ActionItem<TqManagementDashboardRow>[] = useMemo(() => [
        {
            label: 'TQ Received',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqReceived(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ awaited',
        },
        {
            label: 'Mark as No TQ',
            onClick: (row: TqManagementDashboardRow) => {
                handleMarkAsNoTq(row.tenderId);
            },
            icon: <CheckCircle className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ awaited',
        },
        {
            label: 'TQ Replied',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqReplied(row.tqId!));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ received' && row.tqId !== null,
        },
        {
            label: 'TQ Missed',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqMissed(row.tqId!));
            },
            icon: <XCircle className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ received' && row.tqId !== null,
        },
        {
            label: 'Edit TQ Received',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqEditReceived(row.tqId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ received' && row.tqId !== null,
        },
        {
            label: 'Edit TQ Reply',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqEditReplied(row.tqId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ replied' && row.tqId !== null,
        },
        {
            label: 'Edit TQ Missed',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqEditMissed(row.tqId!));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.tqStatus === 'TQ missed' && row.tqId !== null,
        },
        {
            label: 'View TQ Details',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqView(row.tqId!));
            },
            icon: <Eye className="h-4 w-4" />,
            visible: (row) => row.tqId !== null,
        },
        {
            label: 'View All TQs',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tqViewAll(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
            visible: (row) => row.tqCount > 1,
        },
        {
            label: 'View Tender',
            onClick: (row: TqManagementDashboardRow) => {
                navigate(paths.tendering.tenderView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ], [navigate, markNoTqMutation]);

    const tabsConfig = useMemo(() => {
        if (!tqManagementData) return [];

        return [
            {
                key: 'awaited' as TabKey,
                name: 'TQ Awaited',
                count: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ awaited'
                ).length,
                data: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ awaited'
                ),
            },
            {
                key: 'received' as TabKey,
                name: 'TQ Received',
                count: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ received'
                ).length,
                data: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ received'
                ),
            },
            {
                key: 'replied' as TabKey,
                name: 'TQ Replied',
                count: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ replied'
                ).length,
                data: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ replied'
                ),
            },
            {
                key: 'missed' as TabKey,
                name: 'TQ Missed',
                count: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ missed'
                ).length,
                data: tqManagementData.filter((item) =>
                    item.tqStatus === 'TQ missed'
                ),
            },
            {
                key: 'noTq' as TabKey,
                name: 'No TQ',
                count: tqManagementData.filter((item) =>
                    item.tqStatus === 'No TQ'
                ).length,
                data: tqManagementData.filter((item) =>
                    item.tqStatus === 'No TQ'
                ),
            },
        ];
    }, [tqManagementData]);

    const colDefs = useMemo<ColDef<TqManagementDashboardRow>[]>(() => [
        tenderNameCol<TqManagementDashboardRow>('tenderNo', {
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
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'bidSubmissionDate',
            headerName: 'Bid Submission',
            flex: 1.5,
            minWidth: 170,
            valueGetter: (params: any) => params.data?.bidSubmissionDate ? formatDateTime(params.data.bidSubmissionDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'tqSubmissionDeadline',
            headerName: 'TQ Deadline',
            flex: 1.5,
            minWidth: 170,
            valueGetter: (params: any) => params.data?.tqSubmissionDeadline ? formatDateTime(params.data.tqSubmissionDeadline) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'tqCount',
            headerName: 'TQ Count',
            width: 100,
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
            field: 'tqStatus',
            headerName: 'Status',
            flex: 1,
            minWidth: 130,
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
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(tqManagementActions),
            sortable: false,
            pinned: 'right',
            width: 120,
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
                                <Badge variant="secondary" className="text-xs">
                                    {tab.count}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0"
                        >
                            {tab.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    <FileX2 className="h-12 w-12 mb-4" />
                                    <p className="text-lg font-medium">No {tab.name.toLowerCase()} TQs</p>
                                    <p className="text-sm mt-2">
                                        {tab.key === 'awaited' && 'Submitted bids awaiting TQ will appear here'}
                                        {tab.key === 'received' && 'Received TQs will be shown here'}
                                        {tab.key === 'replied' && 'Replied TQs will appear here'}
                                        {tab.key === 'missed' && 'Missed TQs will be shown here'}
                                        {tab.key === 'noTq' && 'Tenders qualified without TQ will appear here'}
                                    </p>
                                </div>
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
                                            resizable: true
                                        },
                                        pagination: true,
                                        paginationPageSize: 50,
                                        overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No TQs found</span>',
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
    );
};

export default TqManagementListPage;
