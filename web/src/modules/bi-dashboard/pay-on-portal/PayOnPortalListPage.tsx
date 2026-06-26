import { paths } from '@/app/routes/paths';
import { ExportExcelDropdown } from '@/components/bi-dashboard/ExportExcelDropdown';
import { tenderNameCol } from '@/components/data-grid/columns';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { QuickFilter } from '@/components/ui/quick-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayOnPortalDashboard, usePayOnPortalDashboardCounts } from '@/hooks/api/usePayOnPortals';
import { useBiExport } from '@/hooks/useBiExport';

import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { payOnPortalsService } from '@/services/api/pay-on-portals.service';
import type { ColDef } from 'ag-grid-community';
import { AlertCircle, CheckCircle, Clock, Edit, Eye, FileX2, MessageSquare, RotateCcw, Search, Wallet, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PayOnPortalDashboardRow, PayOnPortalDashboardTab } from './helpers/payOnPortal.types';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';

const TABS_CONFIG: Array<{ key: PayOnPortalDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending payments on portal',
    },
    {
        key: 'accepted',
        name: 'Accepted',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Accepted payments on portal',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected payments on portal',
    },
    {
        key: 'returned',
        name: 'Returned',
        icon: <RotateCcw className="h-4 w-4" />,
        description: 'Returned payments on portal',
    },
    {
        key: 'settled',
        name: 'Settled',
        icon: <Wallet className="h-4 w-4" />,
        description: 'Settled payments on portal',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('accepted') || statusLower.includes('settled')) {
        return 'default';
    }
    if (statusLower.includes('rejected')) {
        return 'destructive';
    }
    if (statusLower.includes('returned')) {
        return 'secondary';
    }
    return 'secondary';
};

const PayOnPortalListPage = () => {
    const {
        activeTab, setActiveTab,
        search, setSearch,
        debouncedSearch,
        pagination, setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'pay-on-portal',
        defaultTab: 'pending' as PayOnPortalDashboardTab,
    });
    const [teamFilter, setTeamFilter] = useState<string>('All');
    const teamId = teamFilter === 'All' ? undefined : teamFilter === 'AC' ? 1 : 2;

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [teamFilter]);

    const flattenFormData = (data: Record<string, any>): Record<string, any> => {
        const out: Record<string, any> = {};
        if (data.portalName) out['Portal Name'] = data.portalName;
        if (data.utrNo) out['UTR'] = data.utrNo;
        if (data.transactionDate) out['Transaction Date'] = new Date(data.transactionDate).toLocaleDateString('en-GB');
        if (data.utrMsg) out['UTR Message'] = data.utrMsg;
        if (data.returnTransferDate) out['Return Transfer Date'] = new Date(data.returnTransferDate).toLocaleDateString('en-GB');
        if (data.returnUtr) out['Return UTR'] = data.returnUtr;
        if (data.reason) out['Reason'] = data.reason;
        if (data.remarks) out['Remarks'] = data.remarks;
        if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
        return out;
    };

    const { exportTab, setExportTab, exporting, handleExport, exportOptions } = useBiExport({
        getAllFn: (params) => payOnPortalsService.getAll(params),
        getExportDataFn: (params) => payOnPortalsService.getExportData(params),
        tabsConfig: TABS_CONFIG,
        pendingTabKey: 'pending',
        tabsWithForm: ['accepted', 'rejected', 'returned', 'settled'],
        filenamePrefix: 'pay-on-portals',
        flattenFormData,
        mapPendingRow: (r: any) => ({
            'Date': r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
            'Tender Name': r.tenderNo || '',
            'Team Member': r.teamMember || '',
            'Tender Status': r.tenderStatus || '',
            'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
            'Purpose': r.purpose || '',
            'Amount': r.amount || '',
            'POP Status': r.popStatus || '',
        }),
        mapRow: (r: any, isAllTab: boolean) => {
            const base: Record<string, any> = {
                'Date': r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
                'Tender Name': r.tenderNo || '',
                'Team Member': r.teamMember || '',
                'Tender Status': r.tenderStatus || '',
                'UTR No': r.utrNo || '',
                'Portal Name': r.portalName || '',
                'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
                'Purpose': r.purpose || '',
                'Amount': r.amount || '',
                'POP Status': r.popStatus || '',
            };
            if (isAllTab) base['Tab'] = r._tab || '';
            return base;
        },
    });

    const { data: apiResponse, isLoading, error } = usePayOnPortalDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
        team: teamId,
    });

    const { data: counts } = usePayOnPortalDashboardCounts();

    const navigate = useNavigate();
    const popData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const popActions: ActionItem<PayOnPortalDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: PayOnPortalDashboardRow) => navigate(paths.bi.payOnPortalView(row.id)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: PayOnPortalDashboardRow) => navigate(paths.bi.payOnPortalAction(row.id)),
            },
            {
                label: 'Meeting Remarks',
                icon: <MessageSquare className="h-4 w-4" />,
                onClick: (row: PayOnPortalDashboardRow) => navigate(paths.bi.payOnPortalMeetingRemarks(row.requestId)),
            }
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<PayOnPortalDashboardRow>[]>(
        () => [
            {
                field: 'date',
                headerName: 'Date',
                width: 110,
                colId: 'date',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
                hide: activeTab === 'pending' || activeTab === 'rejected',
            },
            tenderNameCol<PayOnPortalDashboardRow>('tenderNo', {
                headerName: 'Tender Name',
                width: 200,
                maxWidth: 200,
                colId: 'tenderNo',
                sortable: true,
            }),
            {
                field: 'teamMember',
                headerName: 'Team Member',
                width: 140,
                maxWidth: 140,
                colId: 'teamMember',
                valueGetter: (params) => params.data?.teamMember || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                width: 140,
                maxWidth: 140,
                colId: 'tenderStatus',
                valueGetter: (params) => params.data?.tenderStatus || params.data?.type || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'utrNo',
                headerName: 'UTR No',
                width: 150,
                maxWidth: 150,
                colId: 'utrNo',
                valueGetter: (params) => params.data?.utrNo || params.data?.utr || '—',
                sortable: true,
                filter: true,
                hide: activeTab === 'pending' || activeTab === 'rejected',
            },
            {
                field: 'portalName',
                headerName: 'Portal Name',
                width: 120,
                colId: 'portalName',
                valueGetter: (params) => params.data?.portalName || '—',
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
                field: 'amount',
                headerName: 'Amount',
                width: 110,
                maxWidth: 110,
                colId: 'amount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'bidValidity',
                headerName: 'Bid Validity',
                width: 130,
                maxWidth: 130,
                colId: 'bidValidity',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
            },
            {
                field: 'popStatus',
                headerName: 'POP Status',
                width: 110,
                colId: 'popStatus',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return <Badge variant={'secondary'}>Pending</Badge>;
                    return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
                },
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(popActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [popActions, activeTab]
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
                    <CardTitle>Pay on Portal Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load pay on portal records. Please try again later.
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
                            <CardTitle>Pay on Portal Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage payments made on portals for tenders.
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
                            </div>
                        </CardAction>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as PayOnPortalDashboardTab)}
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
                                        {(!popData || popData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} payments</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={popData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No pay on portal records found</span>',
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

export default PayOnPortalListPage;
