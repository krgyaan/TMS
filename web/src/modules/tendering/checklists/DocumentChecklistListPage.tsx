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
import { AlertCircle, Eye, FileX2, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useChecklistDashboardCounts, useDocumentChecklists } from '@/hooks/api/useDocumentChecklists';
import type { TenderDocumentChecklistDashboardRow, TenderDocumentChecklistDashboardRowWithTimer } from './helpers/documentChecklist.types';
import { tenderNameCol } from '@/components/data-grid';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';

const Checklists = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'tender-dnb'>('pending');
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

    const { data: counts } = useChecklistDashboardCounts();

    const { data: apiResponse, isLoading: loading, error } = useDocumentChecklists(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const tabsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const checklistActions: ActionItem<TenderDocumentChecklistDashboardRowWithTimer>[] = [
        {
            label: 'Create',
            onClick: (row: TenderDocumentChecklistDashboardRow) => {
                navigate(paths.tendering.documentChecklistCreate(row.tenderId));
            },
            icon: <Plus className="h-4 w-4" />,
        },
        {
            label: 'Edit',
            onClick: (row: TenderDocumentChecklistDashboardRow) => {
                navigate(paths.tendering.documentChecklistEdit(row.tenderId));
            },
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: TenderDocumentChecklistDashboardRow) => {
                navigate(paths.tendering.documentChecklistView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'pending' as const,
                name: 'Document Checklist Pending',
                count: counts?.pending ?? 0,
            },
            {
                key: 'submitted' as const,
                name: 'Document Checklist Submitted',
                count: counts?.submitted ?? 0,
            },
            {
                key: 'tender-dnb' as const,
                name: 'Tender DNB',
                count: counts?.['tender-dnb'] ?? 0,
            },
        ];
    }, [counts]);

    const colDefs = useMemo<ColDef<TenderDocumentChecklistDashboardRowWithTimer>[]>(() => [
        tenderNameCol<TenderDocumentChecklistDashboardRow>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
        }),
        {
            field: 'teamMemberName',
            colId: 'teamMemberName',
            headerName: 'Member',
            width: 150,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            colId: 'dueDate',
            headerName: 'Due Date',
            width: 150,
            valueGetter: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'gstValues',
            colId: 'gstValues',
            headerName: 'Tender Value',
            width: 130,
            valueGetter: (params: any) => {
                const value = params.data?.gstValues;
                if (value === null || value === undefined) return '—';
                return formatINR(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            colId: 'statusName',
            headerName: 'Tender Status',
            width: 150,
            valueGetter: (params: any) => params.data?.statusName || '—',
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant="default">
                        {status}
                    </Badge>
                );
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
            headerName: '',
            filter: false,
            cellRenderer: createActionColumnRenderer(checklistActions),
            sortable: false,
            pinned: 'right',
            width: 57,
        },
    ], [checklistActions]);

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
                            {Array.from({ length: 2 }).map((_, i) => (
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
                    <CardTitle>Document Checklists</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load checklists. Please try again later.
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
                        <CardTitle>Document Checklists</CardTitle>
                        <CardDescription className="mt-2">
                            Manage document checklists for approved tenders.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'submitted' | 'tender-dnb')}>
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
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} checklists</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending'
                                                    ? 'Tenders requiring checklist submission will appear here'
                                                    : 'Submitted checklists will be shown here'}
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
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No checklists found</span>',
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

export default Checklists;
