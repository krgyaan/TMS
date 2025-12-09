// pages/CostingSheets.tsx

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
import { AlertCircle, Eye, Edit, Send, FileX2, ExternalLink, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useCostingSheets, type CostingSheetDashboardRow } from '@/hooks/api/useCostingSheets';
import { tenderNameCol } from '@/components/data-grid/columns';

type TabKey = 'pending' | 'submitted' | 'rejected';

const CostingSheets = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('pending');
    const navigate = useNavigate();

    const { data: costingSheetsData, isLoading: loading, error } = useCostingSheets();

    const costingSheetActions: ActionItem<CostingSheetDashboardRow>[] = useMemo(() => [
        {
            label: 'Create Costing Sheet',
            onClick: (row: CostingSheetDashboardRow) => {
                navigate(paths.tendering.costingSheetSubmit(row.tenderId));
            },
            icon: <Plus className="h-4 w-4" />,
            visible: (row) => row.googleSheetUrl ? false : true,
        },
        {
            label: 'Submit Costing',
            onClick: (row: CostingSheetDashboardRow) => {
                navigate(paths.tendering.costingSheetSubmit(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.googleSheetUrl ? true : false,
        },
        {
            label: 'Edit Costing',
            onClick: (row: CostingSheetDashboardRow) => {
                navigate(paths.tendering.costingSheetEdit(row.tenderId));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Submitted',
        },
        {
            label: 'Re-submit Costing',
            onClick: (row: CostingSheetDashboardRow) => {
                navigate(paths.tendering.costingSheetResubmit(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Rejected/Redo',
        },
        {
            label: 'View Tender',
            onClick: (row: CostingSheetDashboardRow) => {
                navigate(paths.tendering.tenderView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ], [navigate]);

    const tabsConfig = useMemo(() => {
        if (!costingSheetsData) return [];

        return [
            {
                key: 'pending' as TabKey,
                name: 'Pending',
                count: costingSheetsData.filter((item) =>
                    item.costingStatus === 'Pending' || item.costingStatus === 'Created'
                ).length,
                data: costingSheetsData.filter((item) =>
                    item.costingStatus === 'Pending' || item.costingStatus === 'Created'
                ),
            },
            {
                key: 'submitted' as TabKey,
                name: 'Submitted',
                count: costingSheetsData.filter((item) =>
                    item.costingStatus === 'Submitted' || item.costingStatus === 'Approved'
                ).length,
                data: costingSheetsData.filter((item) =>
                    item.costingStatus === 'Submitted' || item.costingStatus === 'Approved'
                ),
            },
            {
                key: 'rejected' as TabKey,
                name: 'Rejected/Redo',
                count: costingSheetsData.filter((item) =>
                    item.costingStatus === 'Rejected/Redo'
                ).length,
                data: costingSheetsData.filter((item) =>
                    item.costingStatus === 'Rejected/Redo'
                ),
            },
        ];
    }, [costingSheetsData]);

    const colDefs = useMemo<ColDef<CostingSheetDashboardRow>[]>(() => [
        tenderNameCol<CostingSheetDashboardRow>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            minWidth: 250,
        }),
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
            field: 'dueDate',
            headerName: 'Due Date',
            flex: 1.5,
            minWidth: 150,
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
            field: 'costingStatus',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return status;
            },
        },
        {
            field: 'submittedFinalPrice',
            headerName: 'Final Price',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
                const value = params.data?.submittedFinalPrice;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'submittedBudgetPrice',
            headerName: 'Budget',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
                const value = params.data?.submittedBudgetPrice;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'googleSheetUrl',
            headerName: 'Sheet',
            width: 80,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                const url = params.value;
                if (!url) return '—';
                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                );
            },
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(costingSheetActions),
            sortable: false,
            pinned: 'right',
            width: 50,
        },
    ], [costingSheetActions]);

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
                    <CardTitle>Costing Sheets</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load costing sheets. Please try again later.
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
                        <CardTitle>Costing Sheets</CardTitle>
                        <CardDescription className="mt-2">
                            Manage costing sheets for approved tenders.
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
                                    <p className="text-lg font-medium">No {tab.name.toLowerCase()} costing sheets</p>
                                    <p className="text-sm mt-2">
                                        {tab.key === 'pending' && 'Tenders requiring costing submission will appear here'}
                                        {tab.key === 'submitted' && 'Submitted costing sheets will be shown here'}
                                        {tab.key === 'rejected' && 'Rejected costing sheets requiring re-submission will appear here'}
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
                                        overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No costing sheets found</span>',
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

export default CostingSheets;
