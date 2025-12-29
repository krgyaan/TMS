import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import type { RfqDashboardRow } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, FileX2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { useRfqs, useDeleteRfq } from '@/hooks/api/useRfqs';
import { dateCol, tenderNameCol } from '@/components/data-grid';

const Rfqs = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'sent'>('pending');
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

    const { data: apiResponse, isLoading: loading, error } = useRfqs({
        rfqStatus: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
    });

    const rfqsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const deleteMutation = useDeleteRfq();

    const rfqsActions: ActionItem<RfqDashboardRow>[] = [
        {
            label: 'Send',
            onClick: (row: RfqDashboardRow) => navigate(paths.tendering.rfqsCreate(row.tenderId)),
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: RfqDashboardRow) => {
                navigate(paths.tendering.rfqsView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Delete',
            onClick: (row: RfqDashboardRow) => {
                if (row.rfqId && confirm('Are you sure you want to delete this RFQ?')) {
                    deleteMutation.mutate(row.rfqId);
                }
            },
            icon: <Trash2 className="h-4 w-4" />,
            // show: (row: RfqDashboardRow) => row.rfqId !== null,
        },
    ];

    const tabsConfig = useMemo<{ key: 'pending' | 'sent'; name: string; count: number }[]>(() => {
        // Counts will come from backend, but we can calculate from current data for display
        const pendingCount = activeTab === 'pending' ? totalRows : 0;
        const sentCount = activeTab === 'sent' ? totalRows : 0;

        return [
            {
                key: 'pending',
                name: 'Pending',
                count: pendingCount,
            },
            {
                key: 'sent',
                name: 'Sent',
                count: sentCount,
            },
        ];
    }, [activeTab, totalRows]);

    const colDefs = useMemo<ColDef<RfqDashboardRow>[]>(() => [
        tenderNameCol<RfqDashboardRow>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'teamMemberName',
            headerName: 'Team Member',
            width: 150,
            colId: 'teamMemberName',
            valueGetter: (params: any) => params.data?.teamMemberName ? params.data.teamMemberName : '—',
            sortable: true,
            filter: true,
        },
        dateCol<RfqDashboardRow>('dueDate', {
            headerName: 'Due Date',
            width: 150,
            colId: 'dueDate',
        }),
        {
            field: 'vendorOrganizationNames',
            headerName: 'Vendor',
            width: 150,
            colId: 'vendorOrganizationNames',
            valueGetter: (params) => {
                const names = params.data?.vendorOrganizationNames;
                if (!names) return '—';

                return names;
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'itemName',
            headerName: 'Item',
            width: 150,
            colId: 'itemName',
            valueGetter: (params: any) => params.data?.itemName ? params.data.itemName : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Status',
            width: 100,
            colId: 'statusName',
            valueGetter: (params: any) => params.data?.statusName ? params.data.statusName : '—',
            sortable: true,
            filter: true,
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(rfqsActions),
            sortable: false,
            pinned: 'right',
            width: 80,
        },
    ], [rfqsActions]);

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
                    <CardTitle>RFQs</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load RFQs. Please try again later.
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
                        <CardTitle>RFQs</CardTitle>
                        <CardDescription className="mt-2">
                            Review and approve RFQs.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'sent')}>
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
                                    {(!rfqsData || rfqsData.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} RFQs</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending'
                                                    ? 'Tenders requiring RFQs will appear here'
                                                    : 'Sent RFQs will be shown here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={rfqsData}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No RFQs found</span>',
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

export default Rfqs;
