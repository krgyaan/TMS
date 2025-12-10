import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useAllTenders } from '@/hooks/api/useTenderApprovals';
import type { TenderApprovalRow, PaginatedResult } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { toast } from 'sonner';
import { tenderNameCol } from '@/components/data-grid';

const TABS_NAMES = {
    '0': 'Pending',
    '1': 'Approved',
    '2': 'Rejected',
    '3': 'Incomplete',
} as const;

type TabConfig = {
    key: '0' | '1' | '2' | '3';
    name: string;
    count: number;
};

const TenderApprovalListPage = () => {
    const [activeTab, setActiveTab] = useState<'0' | '1' | '2' | '3'>('0');
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

    // Fetch counts (all data without filters) - returns Record format
    const { data: countsData } = useAllTenders();

    // Fetch paginated data for active tab - returns PaginatedResult format
    const {
        data: apiResponse,
        isLoading: loading,
        error
    } = useAllTenders({
        tlStatus: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
    });

    // apiResponse with filters always returns PaginatedResult
    const approvalData = apiResponse && 'meta' in apiResponse
        ? (apiResponse as PaginatedResult<TenderApprovalRow>).data
        : [];
    const totalRows = apiResponse && 'meta' in apiResponse
        ? (apiResponse as PaginatedResult<TenderApprovalRow>).meta.total
        : 0;

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

    const tabsConfig = useMemo<TabConfig[]>(() => {
        // Use countsData for counts if available (Record format), otherwise use totalRows for active tab
        if (countsData && typeof countsData === 'object' && !('meta' in countsData)) {
            const counts = countsData as Record<string, TenderApprovalRow[]>;
            return Object.entries(TABS_NAMES).map(([key, name]) => ({
                key: key as '0' | '1' | '2' | '3',
                name,
                count: counts[name]?.length || 0,
            }));
        }

        // Fallback: use totalRows for active tab, 0 for others
        return Object.entries(TABS_NAMES).map(([key, name]) => ({
            key: key as '0' | '1' | '2' | '3',
            name,
            count: activeTab === key ? totalRows : 0,
        }));
    }, [countsData, activeTab, totalRows]);

    const colDefs = useMemo<ColDef<TenderApprovalRow>[]>(() => [
        tenderNameCol<TenderApprovalRow>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            minWidth: 250,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'teamMemberName',
            headerName: 'Member',
            flex: 1.5,
            minWidth: 150,
            colId: 'teamMemberName',
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date/Time',
            flex: 1.5,
            minWidth: 150,
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
            flex: 1,
            minWidth: 130,
            colId: 'gstValues',
            valueGetter: (params: any) => {
                const value = params.data?.gstValues;
                if (value === null || value === undefined) return '—';
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'itemName',
            headerName: 'Item',
            flex: 0.8,
            minWidth: 80,
            colId: 'itemName',
            valueGetter: (params: any) => params.data?.itemName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
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
            flex: 1,
            minWidth: 120,
            colId: 'tlStatus',
            cellRenderer: (params: any) => {
                const tlStatus = params.data?.tlStatus;
                const statusName = TABS_NAMES[tlStatus as keyof typeof TABS_NAMES];
                const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                    '0': 'outline',
                    '1': 'default',
                    '2': 'destructive',
                    '3': 'secondary',
                };
                const badgeVariant = variants[tlStatus as string] || 'secondary';
                const isGreen = tlStatus === '1';
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
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(approvalActions),
            sortable: false,
            pinned: 'right',
            width: 120,
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
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as '0' | '1' | '2' | '3')}>
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
