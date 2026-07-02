import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useEffect } from 'react';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { AlertCircle, Eye, FileX2, Search, Edit, CheckCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger } from '@radix-ui/react-tooltip';
import { TooltipContent } from '@/components/ui/tooltip';
import { useWoDetails, useWoDetailsDashboardSummary } from '@/hooks/api/useWoDetails';
import type { WoDetailsListResponseDto, WoDetailsFilters } from '@/modules/operations/types/wo.types';
import { currencyCol, dateCol } from '@/components/data-grid';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';
import { QuickFilter } from '@/components/ui/quick-filter';
import { useTeamFilter } from '@/hooks/useTeamFilter';

type TabKey = 'pending' | 'accepted' | 'amendment-needed';

const WoDetailListPage = () => {
    const {
        activeTab, setActiveTab,
        search, setSearch,
        debouncedSearch,
        pagination, setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'wo-details',
        defaultTab: 'pending' as TabKey,
    });
    const navigate = useNavigate();
    const { teamId } = useTeamFilter();

    // Reset pagination on team change (hook handles tab/search)
    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [teamId]);

    // Build filters based on active tab
    const filters: WoDetailsFilters = useMemo(() => {
        const baseFilters: WoDetailsFilters = {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
            search: debouncedSearch,
            teamId: teamId === null ? undefined : teamId,
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
    }, [activeTab, pagination, sortModel, debouncedSearch, teamId]);

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
            label: 'WO Acceptance',
            onClick: (row) => navigate(paths.operations.woAcceptancePage(row.id)),
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'Request for Clarification',
            onClick: (row) => row.woAcceptanceStatus == 'queries_pending' ? navigate(paths.operations.woRaiseQueryEditPage(row.id)) : navigate(paths.operations.woRaiseQueryPage(row.id)),
            icon: <FileX2 className="h-4 w-4" />,
        },
        {
            label: 'Wo Uploads',
            onClick: (row) => navigate(paths.operations.woUploadPage(row.id)),
            icon: <FileText className="h-4 w-4" />,
        },
        {
            label: 'View Details',
            onClick: (row) => navigate(paths.operations.woDetailShowPage(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.operations.woAcceptanceEditPage(row.id)),
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
                cellRenderer: (params: any) => {
                    return <Badge variant='outline' className="capitalize">
                        {params.value?.replaceAll('_', ' ')}
                    </Badge>
                },
            },
            {
                field: 'woAcceptanceStatus',
                colId: 'woAcceptanceStatus',
                headerName: 'Acceptance',
                width: 120,
                cellRenderer: (params: any) => {
                    return <Badge variant='outline' className="capitalize">
                        {params.value ? params.value?.replaceAll('_', ' ') : 'Pending'}
                    </Badge>
                },
            },
            {
                field: 'oeFirstName',
                colId: 'oeFirstName',
                headerName: 'OE',
                width: 150,
                cellRenderer: (params: { value: string | null; data: WoDetailsListResponseDto }) => {
                    const { oeFirstName, oeSiteVisitName, oeDocsPrepName } = params.data;

                    const uniqueOEs = [...new Set([oeFirstName, oeSiteVisitName, oeDocsPrepName].filter(Boolean))];
                    const totalUnique = uniqueOEs.length;

                    if (totalUnique === 0) {
                        return (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Unassigned
                            </Badge>
                        );
                    }

                    const primaryName = uniqueOEs[0];
                    const additionalCount = totalUnique - 1;

                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs cursor-pointer">
                                        {primaryName}
                                    </Badge>
                                    {additionalCount > 0 && (<span>+{additionalCount}</span>)}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs space-y-1">
                                    <p><strong>Primary OE:</strong>{' '}
                                        {oeFirstName || <span className="text-muted-foreground">—</span>}
                                    </p>
                                    <p><strong>Site Visit:</strong>{' '}
                                        {oeSiteVisitName || <span className="text-muted-foreground">—</span>}
                                    </p>
                                    <p><strong>Docs Prep:</strong>{' '}
                                        {oeDocsPrepName || <span className="text-muted-foreground">—</span>}
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                },
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: (params: any) => <ActionMenu rowData={params.data} actions={rowActions} />,
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
