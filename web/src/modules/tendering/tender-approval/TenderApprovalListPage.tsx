import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useTenderApprovals, useTenderApprovalsDashboardCounts } from '@/hooks/api/useTenderApprovals';
import type { TenderApprovalWithTimer } from './helpers/tenderApproval.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { toast } from 'sonner';
import { tenderNameCol } from '@/components/data-grid';
import { Input } from '@/components/ui/input';
import { formatINR } from '@/hooks/useINRFormatter';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';

type TenderApprovalTab = 'pending' | 'accepted' | 'rejected' | 'tender-dnb';
type TenderApprovalTabName = 'Pending' | 'Accepted' | 'Rejected' | 'Tender DNB';
const TABS_NAMES: Record<TenderApprovalTab, TenderApprovalTabName> = {
    'pending': 'Pending', 'accepted': 'Accepted', 'rejected': 'Rejected', 'tender-dnb': 'Tender DNB'
};

const TL_STATUS_NAMES: Record<number, string> = { 0: 'Pending', 1: 'Accepted', 2: 'Rejected', 3: 'Tender DNB' };

const TenderApprovalListPage = () => {
    const [activeTab, setActiveTab] = useState<TenderApprovalTab>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, search]);

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

    const { data: apiResponse, isLoading: loading, error } = useTenderApprovals(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: search || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const { data: counts } = useTenderApprovalsDashboardCounts();

    const approvalData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const approvalActions: ActionItem<any>[] = [
        {
            label: 'Approve',
            onClick: (row: any) => {
                const tenderId = row.tenderId || row.id;
                if (!tenderId) {
                    toast.error('Unable to approve: Tender ID is missing');
                    return;
                }
                navigate(paths.tendering.tenderApprovalCreate(tenderId));
            },
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: any) => {
                const tenderId = row.tenderId || row.id;
                if (!tenderId) {
                    toast.error('Unable to view: Tender ID is missing');
                    return;
                }
                navigate(paths.tendering.tenderApprovalView(tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const tabsConfig = useMemo(() => {
        return Object.entries(TABS_NAMES).map(([key, name]) => {
            let count = 0;
            if (counts) {
                switch (key) {
                    case 'pending':
                        count = counts.pending ?? 0;
                        break;
                    case 'accepted':
                        count = counts.accepted ?? 0;
                        break;
                    case 'rejected':
                        count = counts.rejected ?? 0;
                        break;
                    case 'tender-dnb':
                        count = counts['tender-dnb'] ?? 0;
                        break;
                }
            }
            return {
                key: key as 'pending' | 'accepted' | 'rejected' | 'tender-dnb',
                name,
                count,
            };
        });
    }, [counts]);

    const colDefs = useMemo<ColDef<TenderApprovalWithTimer>[]>(() => [
        tenderNameCol<TenderApprovalWithTimer>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'teamMemberName',
            headerName: 'Member',
            width: 150,
            colId: 'teamMemberName',
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date/Time',
            width: 150,
            colId: 'dueDate',
            valueGetter: (params: any) => {
                if (!params.data?.dueDate) return '—';
                return formatDateTime(params.data.dueDate);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'gstValues',
            headerName: 'Tender Value',
            width: 130,
            colId: 'gstValues',
            valueGetter: (params: any) => {
                const value = params.data?.gstValues;
                if (value === null || value === undefined) return '—';
                return formatINR(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'emd',
            headerName: 'EMD',
            width: 100,
            colId: 'emd',
            valueGetter: (params: any) => {
                const value = params.data?.emd;
                if (value === null || value === undefined) return '—';
                return formatINR(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Status',
            width: 180,
            colId: 'statusName',
            cellRenderer: (params: any) => {
                const status = params.data?.statusName;
                if (!status) return '—';
                return (
                    <Badge variant={status ? 'default' : 'secondary'}>
                        {status}
                    </Badge>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'tlStatus',
            headerName: 'TL Status',
            width: 105,
            colId: 'tlStatus',
            cellRenderer: (params: any) => {
                const tlStatus = params.data?.tlStatus;
                const statusName = TL_STATUS_NAMES[tlStatus as number];
                const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                    0: 'outline',
                    1: 'default',
                    2: 'destructive',
                    3: 'secondary',
                };
                const badgeVariant = variants[tlStatus as string] || 'secondary';
                const isGreen = tlStatus === 1;
                return (
                    <Badge
                        variant={badgeVariant}
                        className={isGreen ? 'bg-green-500 text-white' : ''}
                    >
                        {statusName || '—'}
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
                const timer = data.timer;

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
            cellRenderer: createActionColumnRenderer(approvalActions),
            sortable: false,
            pinned: 'right',
            width: 57,
        },
    ], [approvalActions]);

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
                    <CardTitle>Tender Approvals</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load tender approvals. Please try again later.
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
                        <CardTitle>Tender Approvals</CardTitle>
                        <CardDescription className="mt-2">
                            Review and approve tender decisions.
                        </CardDescription>
                    </div>
                    <CardAction>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by tender name, number, value, due date, member, item..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'accepted' | 'rejected' | 'tender-dnb')}>
                    <div className="flex flex-col gap-4 mb-4 px-6">
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
                    </div>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0 m-0 data-[state=inactive]:hidden"
                        >
                            {activeTab === tab.key && (
                                <>
                                    {(!approvalData || approvalData.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} tenders</p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={approvalData}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No tenders found</span>',
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

export default TenderApprovalListPage;
