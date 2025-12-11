import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import type { PhysicalDocsDashboardRow } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, FileX2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { usePhysicalDocs, useDeletePhysicalDoc } from '@/hooks/api/usePhysicalDocs';
import { tenderNameCol } from '@/components/data-grid';

const PhysicalDocsListPage = () => {
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

    const { data: apiResponse, isLoading: loading, error } = usePhysicalDocs(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const tabsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const deleteMutation = useDeletePhysicalDoc();

    const physicalDocsActions: ActionItem<PhysicalDocsDashboardRow>[] = [
        {
            label: 'Send',
            onClick: (row: PhysicalDocsDashboardRow) => row.physicalDocs ? navigate(paths.tendering.physicalDocsEdit(row.tenderId)) : navigate(paths.tendering.physicalDocsCreate(row.tenderId)),
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: PhysicalDocsDashboardRow) => {
                navigate(paths.tendering.physicalDocsView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Delete',
            onClick: (row: PhysicalDocsDashboardRow) => {
                if (row.physicalDocs && confirm('Are you sure you want to delete this physical doc submission?')) {
                    deleteMutation.mutate(row.physicalDocs);
                }
            },
            icon: <Trash2 className="h-4 w-4" />,
            // show: (row: PhysicalDocsDashboardRow) => row.physicalDocs !== null,
        },
    ];

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'pending' as const,
                name: 'Pending',
                count: activeTab === 'pending' ? totalRows : 0,
            },
            {
                key: 'sent' as const,
                name: 'Sent',
                count: activeTab === 'sent' ? totalRows : 0,
            },
        ];
    }, [activeTab, totalRows]);

    const colDefs = useMemo<ColDef<PhysicalDocsDashboardRow>[]>(() => [
        tenderNameCol<PhysicalDocsDashboardRow>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            minWidth: 250,
        }),
        {
            field: 'teamMemberName',
            colId: 'teamMemberName',
            headerName: 'Member',
            flex: 1,
            minWidth: 120,
            valueGetter: (params: any) => params.data?.teamMemberName ? params.data.teamMemberName : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'physicalDocsDeadline',
            colId: 'physicalDocsDeadline',
            headerName: 'Physical Docs Deadline',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.physicalDocsDeadline ? formatDateTime(params.data.physicalDocsDeadline) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'courierAddress',
            colId: 'courierAddress',
            headerName: 'Courier Address',
            minWidth: 300,
            valueGetter: (params: any) => params.data?.courierAddress ? params.data.courierAddress : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            colId: 'statusName',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
            valueGetter: (params: any) => params.data?.statusName ? params.data.statusName : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'courierNo',
            colId: 'courierNo',
            headerName: 'Courier Number',
            flex: 1,
            minWidth: 120,
            valueGetter: (params: any) => params.data?.courierNo ? params.data.courierNo : '—',
            sortable: true,
            filter: true,
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(physicalDocsActions),
            sortable: false,
            pinned: 'right',
            width: 120,
        },
    ], [physicalDocsActions]);

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
                    <CardTitle>Physical Docs</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load physical docs. Please try again later.
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
                        <CardTitle>Physical Docs</CardTitle>
                        <CardDescription className="mt-2">
                            Review and approve physical docs.
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
                                    {tabsData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} physical docs</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending'
                                                    ? 'Tenders requiring physical documents will appear here'
                                                    : 'Sent physical documents will be shown here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={tabsData}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No physical docs found</span>',
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

export default PhysicalDocsListPage;
