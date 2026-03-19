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
import { AlertCircle, Eye, FileX2, Search, Edit, CheckCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWoDetails, useWoDetailsDashboardSummary } from '@/hooks/api/useWoDetails';
import type { WoDetailsListResponseDto, WoDetailsFilters } from '@/modules/operations/types/wo.types';
import { currencyCol, dateCol } from '@/components/data-grid';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';
import { useTeamFilter } from '@/hooks/useTeamFilter';

type TabKey = 'pending' | 'accepted' | 'amendment-needed';

const WoDetailListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();
    const { teamId } = useTeamFilter();

    // Reset pagination on tab/search/team change
    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch, teamId]);

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
    const filters: WoDetailsFilters = useMemo(() => {
        const baseFilters: WoDetailsFilters = {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        };

        switch (activeTab) {
            case 'pending':
                baseFilters.woAcceptance = false;
                baseFilters.woAmendmentNeeded = false;
                break;
            case 'accepted':
                baseFilters.woAcceptance = true;
                break;
            case 'amendment-needed':
                baseFilters.woAmendmentNeeded = true;
                break;
        }

        return baseFilters;
    }, [activeTab, pagination, sortModel]);

    // Fetch data
    const { data: dashboardSummary } = useWoDetailsDashboardSummary();
    const { data: apiResponse, isLoading: loading, error } = useWoDetails(filters);

    const tableData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    // Tab configuration with counts
    const tabsConfig = useMemo(() => {
        const summary = dashboardSummary?.summary;
        return [
            { key: 'pending' as const, name: 'Pending Acceptance', count: summary?.pending ?? 0 },
            { key: 'accepted' as const, name: 'Accepted', count: summary?.accepted ?? 0 },
            {
                key: 'amendment-needed' as const,
                name: 'Amendment Needed',
                count: summary?.amendmentNeeded ?? 0,
            },
        ];
    }, [dashboardSummary]);

    // Action items for each row
    const rowActions: ActionItem<WoDetailsListResponseDto>[] = [
        {
            label: 'Accept/Reject',
            onClick: (row) => navigate(paths.operations.woDetailAcceptanceShowPage(row.id)),
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View Details',
            onClick: (row) => navigate(paths.operations.woDetailAcceptanceShowPage(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.operations.woDetailAcceptanceEditPage(row.id)),
            icon: <Edit className="h-4 w-4" />,
        },
    ];

    // Column definitions
    const colDefs = useMemo<ColDef<WoDetailsListResponseDto>[]>(
        () => [
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project Name',
                width: 150,
                sortable: true,
            },
            {
                field: 'woNumber',
                colId: 'woNumber',
                headerName: 'WO Number',
                width: 120,
                sortable: true,
            },
            dateCol<WoDetailsListResponseDto>('woDate', { includeTime: false }, {
                headerName: 'WO Date',
                width: 120,
                colId: 'woDate',
            }),
            currencyCol<WoDetailsListResponseDto>('woValuePreGst', {
                headerName: 'WO Value',
                width: 120,
                colId: 'woValuePreGst',
            }),
            currencyCol<WoDetailsListResponseDto>('woValueGstAmt', {
                headerName: 'GST Amount',
                width: 120,
                colId: 'woValueGstAmt',
            }),
            {
                field: 'oeWoAmendmentNeeded',
                colId: 'oeWoAmendmentNeeded',
                headerName: 'Amendment',
                width: 120,
                cellRenderer: (params: any) => (
                    <Badge variant={params.value ? 'default' : 'secondary'}>
                        {params.value ? 'Yes' : 'No'}
                    </Badge>
                ),
            },
            {
                field: 'ldApplicable',
                colId: 'ldApplicable',
                headerName: 'LD',
                width: 90,
                cellRenderer: (params: any) => (
                    <Badge variant={params.value ? 'default' : 'secondary'}>
                        {params.value ? 'Yes' : 'No'}
                    </Badge>
                ),
            },
            {
                field: 'isContractAgreement',
                colId: 'isContractAgreement',
                headerName: 'Contract',
                width: 100,
                cellRenderer: (params: any) => (
                    <div className="flex items-center gap-1">
                        <FileText className={`h-4 w-4 ${params.value ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span>{params.value ? 'Yes' : 'No'}</span>
                    </div>
                ),
            },
            {
                field: 'status',
                colId: 'status',
                headerName: 'WO Status',
                width: 120,
                cellRenderer: (params: any) => <span className="capitalize">{params.value}</span>,
            },
            {
                field: 'woAcceptanceStatus',
                colId: 'woAcceptanceStatus',
                headerName: 'Acceptance',
                width: 120,
                cellRenderer: (params: any) => <span className="capitalize">{params.value}</span>,
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
        [rowActions, navigate]
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
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-32" />
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
                    <CardTitle>Work Orders - Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load WO details. Please try again later.
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
                        <CardTitle>Work Orders - Details</CardTitle>
                        <CardDescription className="mt-2">
                            Manage WO contractual details, LD, PBG, acceptance.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as TabKey)}
                >
                    <TabsList className="m-auto mb-4">
                        {tabsConfig.map((tab) => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="data-[state=active]:shadow-md flex items-center gap-1"
                            >
                                <span className="font-semibold text-sm">{tab.name}</span>
                                <Badge
                                    variant="secondary"
                                    className="text-xs"
                                >
                                    {tab.count}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Search and Filters Row */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        <QuickFilter
                            options={[
                                { label: 'LD Applicable', value: 'ld-applicable' },
                                { label: 'PBG Required', value: 'pbg-required' },
                                { label: 'Contract Needed', value: 'contract-needed' },
                            ]}
                            value=""
                            onChange={(value) => {
                                console.log(value);
                            }}
                        />

                        <div className="flex-1 flex justify-end">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-64"
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
                                            <p className="text-lg font-medium">No WO details found</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending'
                                                    ? 'WO details pending acceptance will appear here'
                                                    : tab.key === 'accepted'
                                                        ? 'Accepted WO details will be shown here'
                                                        : tab.key === 'amendment-needed'
                                                            ? 'WO details requiring amendments will appear here'
                                                            : 'No WO details available'}
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
                                                    '<span style="padding: 10px; text-align: center;">No WO details found</span>',
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

export default WoDetailListPage;
