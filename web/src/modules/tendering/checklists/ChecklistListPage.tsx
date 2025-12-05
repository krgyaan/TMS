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
import { AlertCircle, Eye, FileX2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useChecklists, type ChecklistDashboardRow } from '@/hooks/api/useChecklists';

const Checklists = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
    const navigate = useNavigate();

    const { data: tabsData, isLoading: loading, error } = useChecklists();

    const checklistActions: ActionItem<ChecklistDashboardRow>[] = [
        {
            label: 'View',
            onClick: (row: ChecklistDashboardRow) => {
                navigate(paths.tendering.tenderView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const tabsConfig = useMemo<{ key: 'pending' | 'submitted'; name: string; count: number; data: ChecklistDashboardRow[] }[]>(() => {
        if (!tabsData || typeof tabsData !== 'object' || !Array.isArray(tabsData)) return [];

        return [
            {
                key: 'pending',
                name: 'Pending',
                count: tabsData.filter((item) => !item.checklistSubmitted).length,
                data: tabsData.filter((item) => !item.checklistSubmitted),
            },
            {
                key: 'submitted',
                name: 'Checklist Submitted',
                count: tabsData.filter((item) => item.checklistSubmitted).length,
                data: tabsData.filter((item) => item.checklistSubmitted),
            },
        ];
    }, [tabsData]);

    const colDefs = useMemo<ColDef<ChecklistDashboardRow>[]>(() => [
        {
            field: 'tenderNo',
            headerName: 'Tender No',
            flex: 1,
            minWidth: 120,
            sortable: true,
            filter: true,
            valueGetter: (params: any) => params.data?.tenderNo || '—',
        },
        {
            field: 'tenderName',
            headerName: 'Tender Name',
            flex: 2,
            minWidth: 200,
            sortable: true,
            filter: true,
            valueGetter: (params: any) => params.data?.tenderName || '—',
        },
        {
            field: 'teamMemberName',
            headerName: 'Member',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'itemName',
            headerName: 'Item',
            flex: 1,
            minWidth: 120,
            valueGetter: (params: any) => params.data?.itemName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'gstValues',
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
            field: 'statusName',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
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
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(checklistActions),
            sortable: false,
            pinned: 'right',
            width: 120,
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
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'submitted')}>
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
                                    <p className="text-lg font-medium">No {tab.name.toLowerCase()} checklists</p>
                                    <p className="text-sm mt-2">
                                        {tab.key === 'pending'
                                            ? 'Tenders requiring checklist submission will appear here'
                                            : 'Submitted checklists will be shown here'}
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
                                        overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No checklists found</span>',
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

export default Checklists;
