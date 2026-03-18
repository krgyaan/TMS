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
import { AlertCircle, Eye, FileX2, Search, Edit, UserPlus, Plus, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWoBasicDetails, useWoBasicDetailsDashboardSummary } from '@/hooks/api/useWoBasicDetails';
import type { WoBasicDetail, WoBasicDetailsFilters, WorkflowStage } from '@/modules/operations/types/wo.types';
import { currencyCol, dateCol } from '@/components/data-grid';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';

type TabKey = 'basic_details' | 'wo_details' | 'wo_acceptance' | 'wo_upload' | 'completed';

const BasicDetailListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('basic_details');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    // Reset pagination on tab/search change
    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api
            .getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc',
            }));
        setSortModel(sortModel);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    // Build filters based on active tab
    const filters: WoBasicDetailsFilters = useMemo(() => {
        const baseFilters: WoBasicDetailsFilters = {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        };

        return baseFilters;
    }, [activeTab, pagination, debouncedSearch, sortModel]);

    // Fetch data
    const { data: dashboardSummary } = useWoBasicDetailsDashboardSummary();
    const { data: apiResponse, isLoading: loading, error } = useWoBasicDetails(filters);

    const tableData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    // Tab configuration with counts
    const tabsConfig = useMemo(() => {
        const summary = dashboardSummary?.summary;
        return [
            { key: 'basic_details' as const, name: 'Basic Details', count: summary?.basicDetails ?? 0 },
            { key: 'wo_details' as const, name: 'WO Details', count: summary?.woDetails ?? 0 },
            { key: 'wo_acceptance' as const, name: 'Acceptance', count: summary?.woAcceptance ?? 0 },
            { key: 'completed' as const, name: 'Completed', count: summary?.completed ?? 0 },
        ];
    }, [dashboardSummary]);

    // Action items for each row
    const rowActions: ActionItem<WoBasicDetail>[] = [
        {
            label: 'View Details',
            onClick: (row) => navigate(paths.operations.woBasicDetailShowPage((row.id))),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Assign OE',
            onClick: (row) => navigate(paths.operations.woBasicDetailShowPage((row.id))),
            icon: <UserPlus className="h-4 w-4" />,
        },
        {
            label: 'WO Details',
            onClick: (row) => navigate(paths.operations.woDetailCreatePage(row.id)),
            icon: <FileText className="h-4 w-4" />,
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.operations.woBasicDetailEditPage(row.id)),
            icon: <Edit className="h-4 w-4" />,
        },
    ];

    // Stage badge renderer
    const getStageBadge = (stage: WorkflowStage | null) => {
        if (!stage) return <Badge variant="secondary">—</Badge>;

        const stageConfig: Record<WorkflowStage, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            basic_details: { label: 'Basic Details', variant: 'secondary' },
            wo_details: { label: 'WO Details', variant: 'default' },
            wo_acceptance: { label: 'Acceptance', variant: 'outline' },
            wo_upload: { label: 'Upload', variant: 'default' },
            completed: { label: 'Completed', variant: 'default' },
        };

        const config = stageConfig[stage];
        return <Badge variant={config?.variant || 'secondary'}>{config?.label || stage}</Badge>;
    };

    // Column definitions
    const colDefs = useMemo<ColDef<WoBasicDetail>[]>(
        () => [
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project Name',
                width: 200,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => (
                    <div className="flex flex-col">
                        <span className="font-medium truncate">{params.value || '—'}</span>
                        {params.data?.woNumber && (
                            <span className="text-xs text-muted-foreground">
                                WO: {params.data.woNumber}
                            </span>
                        )}
                    </div>
                ),
            },
            dateCol<WoBasicDetail>('woDate', { includeTime: false }, {
                headerName: 'WO Date',
                width: 120,
                colId: 'woDate',
            }),
            {
                field: 'woNumber',
                colId: 'woNumber',
                headerName: 'WO Number',
                width: 200,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => <span className="font-mono text-sm font-medium text-primary">
                    {params.value || '—'}
                </span>,
            },
            currencyCol<WoBasicDetail>('woValuePreGst', {
                field: 'woValuePreGst',
                colId: 'woValuePreGst',
                headerName: 'WO Value (Pre-GST)',
                width: 150,
                sortable: true,
            }),
            currencyCol<WoBasicDetail>('woValueGstAmt', {
                field: 'woValueGstAmt',
                colId: 'woValueGstAmt',
                headerName: 'WO Value (GST)',
                width: 150,
                sortable: true,
            }),
            {
                field: 'grossMargin',
                colId: 'grossMargin',
                headerName: 'Gross Margin',
                width: 120,
                sortable: true,
                cellRenderer: (params: any) => {
                    const value = params.value;
                    if (!value) return '—';
                    const numValue = parseFloat(value);
                    const colorClass = numValue >= 0 ? 'text-green-600' : 'text-red-600';
                    return <span className={`font-medium ${colorClass}`}>{numValue.toFixed(2)}%</span>;
                },
            },
            {
                field: 'currentStage',
                colId: 'currentStage',
                headerName: 'Stage',
                width: 130,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => getStageBadge(params.value),
            },
            {
                field: 'oeFirst',
                colId: 'oeFirst',
                headerName: 'Primary OE',
                width: 120,
                cellRenderer: (params: any) => {
                    if (!params.value) {
                        return (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Unassigned
                            </Badge>
                        );
                    }
                    return <span>OE #{params.value}</span>;
                },
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(rowActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [rowActions]
    );

    // Loading state
    if (loading && !tableData.length) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-24" />
                            ))}
                        </div>
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Work Orders - Basic Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load work orders. Please try again later.
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
                        <CardTitle>Work Orders - Basic Details</CardTitle>
                        <CardDescription className="mt-2">
                            Manage work order basic details and OE assignments.
                        </CardDescription>
                    </div>
                    <Button className='hidden' onClick={() => navigate(paths.operations.woBasicDetailCreatePage)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Work Order
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as TabKey)}
                >
                    <TabsList className="m-auto mb-4 flex-wrap">
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

                    {/* Search and Filters Row */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        <QuickFilter
                            options={[
                                { label: 'This Week', value: 'this-week' },
                                { label: 'This Month', value: 'this-month' },
                                { label: 'This Year', value: 'this-year' },
                            ]}
                            value={search}
                            onChange={(value) => setSearch(value)}
                        />

                        <div className="flex-1 flex justify-end">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by project code, name, WO number..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-80"
                                />
                            </div>
                        </div>
                    </div>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0 m-0 data-[state=inactive]:hidden"
                        >
                            {activeTab === tab.key && (
                                <>
                                    {tableData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">
                                                No work orders found
                                            </p>
                                            <p className="text-sm mt-2">
                                                No work orders in ${tab.name.toLowerCase()} stage
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={tableData}
                                            columnDefs={colDefs as ColDef<any>[]}
                                            loading={loading}
                                            manualPagination={true}
                                            rowCount={totalRows}
                                            paginationState={pagination}
                                            onPaginationChange={setPagination}
                                            onPageSizeChange={handlePageSizeChange}
                                            showTotalCount={true}
                                            showLengthChange={true}
                                            gridOptions={{
                                                defaultColDef: {
                                                    editable: false,
                                                    filter: true,
                                                    sortable: true,
                                                    resizable: true,
                                                },
                                                onSortChanged: handleSortChanged,
                                                overlayNoRowsTemplate:
                                                    '<span style="padding: 10px; text-align: center;">No work orders found</span>',
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

export default BasicDetailListPage;
