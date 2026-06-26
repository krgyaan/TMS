import { paths } from '@/app/routes/paths';
import { tenderNameCol } from '@/components/data-grid/columns';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { QuickFilter } from '@/components/ui/quick-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDemandDraftDashboard, useDemandDraftDashboardCounts } from '@/hooks/api/useDemandDrafts';

import { useBiExport } from '@/hooks/useBiExport';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { demandDraftsService } from '@/services/api/demand-drafts.service';
import { ExportExcelDropdown } from '@/components/bi-dashboard/ExportExcelDropdown';
import type { ColDef } from 'ag-grid-community';
import { AlertCircle, CheckCircle, Clock, Edit, Eye, FileX2, MessageSquare, Plus, RotateCcw, Search, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardTab, DemandDraftDashboardRow } from './helpers/demandDraft.types';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';

const TABS_CONFIG: Array<{ key: DashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending demand drafts',
    },
    {
        key: 'created',
        name: 'Created',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Created demand drafts',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected demand drafts',
    },
    {
        key: 'returned',
        name: 'Returned',
        icon: <RotateCcw className="h-4 w-4" />,
        description: 'Returned demand drafts',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled demand drafts',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('created')) {
        return 'default';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
        return 'destructive';
    }
    return 'secondary';
};

const DemandDraftListPage = () => {
    const {
        activeTab, setActiveTab,
        search, setSearch,
        debouncedSearch,
        pagination, setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'demand-drafts',
        defaultTab: 'pending' as DashboardTab,
    });
    const navigate = useNavigate();
    const [teamFilter, setTeamFilter] = useState<string>('All');
    const teamId = teamFilter === 'All' ? undefined : teamFilter === 'AC' ? 1 : 2;

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [teamFilter]);

    const flattenFormData = (data: Record<string, any>): Record<string, any> => {
        const out: Record<string, any> = {};
        if (data.ddNo) out['DD No'] = data.ddNo;
        if (data.ddDate) out['DD Date'] = new Date(data.ddDate).toLocaleDateString('en-GB');
        if (data.reqNo) out['Courier Req No'] = data.reqNo;
        if (data.ddNeeds) out['Deliver By'] = data.ddNeeds;
        if (data.ddPurpose) out['Purpose Detail'] = data.ddPurpose;
        if (data.ddRemarks) out['Remarks'] = data.ddRemarks;
        if (data.utr) out['UTR'] = data.utr;
        if (data.issueDate) out['Issue Date'] = new Date(data.issueDate).toLocaleDateString('en-GB');
        if (data.expiryDate) out['Expiry Date'] = new Date(data.expiryDate).toLocaleDateString('en-GB');
        if (data.payableAt) out['Payable At'] = data.payableAt;
        if (data.docketNo) out['Docket No'] = data.docketNo;
        return out;
    };

    const { exportTab, setExportTab, exporting, handleExport, exportOptions } = useBiExport({
        getAllFn: (params) => demandDraftsService.getAll(params),
        getExportDataFn: (params) => demandDraftsService.getExportData(params),
        tabsConfig: TABS_CONFIG,
        pendingTabKey: 'pending',
        tabsWithForm: ['created', 'rejected', 'returned', 'cancelled'],
        filenamePrefix: 'demand-drafts',
        flattenFormData,
        mapPendingRow: (r: any) => ({
            'Tender Name': r.projectName || r.tenderName || '',
            'Tender No': r.tenderNo || r.projectNo || '',
            'DD Date': r.ddCreationDate ? new Date(r.ddCreationDate).toLocaleDateString('en-GB') : '',
            'DD No': r.ddNo || '',
            'Tender Status': r.tenderStatus || '',
            'Beneficiary name': r.beneficiaryName || '',
            'Purpose': r.purpose || '',
            'DD Amount': r.ddAmount || '',
            'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
            'Member': r.teamMember || '',
            'Expiry': r.expiry || '',
            'DD Status': r.ddStatus || '',
        }),
        mapRow: (r: any, isAllTab: boolean) => {
            const base: Record<string, any> = {
                'Tender Name': r.projectName || r.tenderName || '',
                'Tender No': r.tenderNo || r.projectNo || '',
                'Tender Status': r.tenderStatus || '',
                'Beneficiary name': r.beneficiaryName || '',
                'Purpose': r.purpose || '',
                'DD Amount': r.ddAmount || '',
                'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
                'Member': r.teamMember || '',
                'Expiry': r.expiry || '',
                'DD Status': r.ddStatus || '',
            };
            if (isAllTab) base['Tab'] = r._tab || '';
            if (r.ddCreationDate) base['DD Date'] = new Date(r.ddCreationDate).toLocaleDateString('en-GB');
            if (r.ddNo) base['DD No'] = r.ddNo;
            return base;
        },
    });

    const { data: apiResponse, isLoading, error } = useDemandDraftDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
        team: teamId,
    });

    const { data: counts } = useDemandDraftDashboardCounts();

    const ddData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const ddActions: ActionItem<DemandDraftDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: DemandDraftDashboardRow) => navigate(paths.bi.demandDraftView(row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: DemandDraftDashboardRow) => navigate(paths.bi.demandDraftAction(row.id))
            },
            {
                label: "Meeting Remark",
                icon: <MessageSquare className='h-4 w-4' />,
                onClick: (row: DemandDraftDashboardRow) => navigate(paths.bi.DDMeetingRemarks(row.requestId))
            }
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<DemandDraftDashboardRow>[]>(
        () => [
            {
                field: 'ddCreationDate',
                headerName: 'DD Date',
                width: 110,
                colId: 'ddCreationDate',
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
                sortable: true,
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
                hide: activeTab === 'pending' || activeTab === 'rejected',
            },
            {
                field: 'ddNo',
                headerName: 'DD No',
                width: 100,
                colId: 'ddNo',
                valueGetter: (params) => params.data?.ddNo || '—',
                sortable: true,
                filter: true,
                hide: activeTab === 'pending' || activeTab === 'rejected',
            },
            tenderNameCol<DemandDraftDashboardRow>('tenderNo', {
                headerName: 'Tender Details',
                filter: true,
                width: 200,
                maxWidth: 200,
                sortable: true,
            }),
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                width: 140,
                colId: 'tenderStatus',
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
                maxWidth: 130,
            },
            {
                field: 'beneficiaryName',
                headerName: 'Beneficiary name',
                maxWidth: 200,
                colId: 'beneficiaryName',
                valueGetter: (params) => params.data?.beneficiaryName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'purpose',
                headerName: 'Purpose',
                width: 100,
                colId: 'purpose',
                valueGetter: (params) => params.data?.purpose || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'ddAmount',
                headerName: 'DD Amount',
                width: 120,
                maxWidth: 120,
                colId: 'ddAmount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'bidValidity',
                headerName: 'Bid Validity',
                width: 110,
                maxWidth: 110,
                colId: 'bidValidity',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
                filter: true,
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
            },
            {
                field: 'teamMember',
                headerName: 'Member',
                width: 120,
                maxWidth: 120,
                colId: 'teamMember',
                valueGetter: (params) => params.data?.teamMember || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'expiry',
                headerName: 'Expiry',
                width: 90,
                maxWidth: 90,
                colId: 'expiry',
                sortable: true,
                valueGetter: (params) => params.data?.expiry || '—',
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    if (status === 'No date') return <Badge variant="secondary">No date</Badge>;
                    if (status === 'Expired') return <Badge variant="destructive">Expired</Badge>;
                    return <Badge variant="default">{status}</Badge>;
                },
            },
            {
                field: 'ddStatus',
                headerName: 'DD Status',
                width: 130,
                maxWidth: 130,
                colId: 'ddStatus',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
                },
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(ddActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [ddActions, activeTab]
    );

    const tabsWithData = useMemo(() => {
        return TABS_CONFIG.map((tab) => {
            let count = 0;
            if (counts) {
                count = counts[tab.key] ?? 0;
            }
            return {
                ...tab,
                count,
            };
        });
    }, [counts]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {TABS_CONFIG.map((_, i) => (
                                <Skeleton key={i} className="h-10 w-36" />
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
                    <CardTitle>Demand Drafts Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load demand drafts. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Demand Drafts Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage demand drafts for tenders.
                            </CardDescription>
                        </div>
                        <CardAction>
                            <div className="flex items-center gap-2">
                                <ExportExcelDropdown
                                    exportOptions={exportOptions}
                                    exportTab={exportTab}
                                    setExportTab={setExportTab}
                                    exporting={exporting}
                                    handleExport={handleExport}
                                />
                                <Button variant="outline" onClick={() => navigate(paths.tendering.oldEmdsForDD())}>
                                    <Plus className="w-4 h-4" />
                                    Add Old Entry
                                </Button>
                            </div>
                        </CardAction>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as DashboardTab)}
                    >
                        <TabsList className="m-auto mb-4">
                            {tabsWithData.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:shadow-md flex items-center gap-2"
                                >
                                    {tab.icon}
                                    <span className="font-semibold text-sm">{tab.name}</span>
                                    {tab.count > 0 && (
                                        <Badge variant="secondary" className="text-xs ml-1">
                                            {tab.count}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* Search Row: Quick Filters, Search Bar */}
                        <div className="flex items-center gap-4 px-6 pb-4">
                            {/* Quick Filters (Left) */}
                            <QuickFilter options={[
                                { label: 'AC Team', value: 'AC' },
                                { label: 'DC Team', value: 'DC' },
                                { label: 'All Team', value: 'All' },
                            ]}
                                value={teamFilter}
                                onChange={(value) => setTeamFilter(value)}
                            />

                            {/* Search Bar (Center) - Flex grow */}
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

                        {tabsWithData.map((tab) => (
                            <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
                                {activeTab === tab.key && (
                                    <>
                                        {(!ddData || ddData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} demand drafts</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={ddData}
                                                columnDefs={colDefs as ColDef<any>[]}
                                                loading={isLoading}
                                                autoSizeColumns={true}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No demand drafts found</span>',
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
        </>
    );
};

export default DemandDraftListPage;
