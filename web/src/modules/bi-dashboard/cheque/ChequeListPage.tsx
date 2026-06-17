import { paths } from '@/app/routes/paths';
import { ExportExcelDropdown } from '@/components/bi-dashboard/ExportExcelDropdown';
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
import { useChequeDashboard, useChequeDashboardCounts } from '@/hooks/api/useCheques';
import { useBiExport } from '@/hooks/useBiExport';

import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { chequesService } from '@/services/api/cheques.service';
import type { ColDef } from 'ag-grid-community';
import { AlertCircle, Calendar, CheckCircle, Clock, Edit, Eye, FileX2, Link, MessageSquare, Plus, Search, Shield, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChequeDashboardRow, ChequeDashboardTab } from './helpers/cheque.types';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';

const TABS_CONFIG: Array<{ key: ChequeDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'cheque-pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending cheques',
    },
    {
        key: 'cheque-payable',
        name: 'Payable',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Payable cheques',
    },
    {
        key: 'cheque-paid-stop',
        name: 'Paid/stop',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Paid or stopped cheques',
    },
    {
        key: 'cheque-for-security',
        name: 'For Security',
        icon: <Shield className="h-4 w-4" />,
        description: 'Cheques for security deposits',
    },
    {
        key: 'cheque-for-dd-fdr',
        name: 'For DD/FDR',
        icon: <Link className="h-4 w-4" />,
        description: 'Cheques for DD/FDR',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected cheques',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled cheques',
    },
    {
        key: 'expired',
        name: 'Expired',
        icon: <Calendar className="h-4 w-4" />,
        description: 'Expired cheques',
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

const ChequeListPage = () => {
    const {
        activeTab, setActiveTab,
        search, setSearch,
        debouncedSearch,
        pagination, setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'cheques',
        defaultTab: 'cheque-pending' as ChequeDashboardTab,
    });
    const navigate = useNavigate();
    const [teamFilter, setTeamFilter] = useState<string>('All');
    const teamId = teamFilter === 'All' ? undefined : teamFilter === 'AC' ? 1 : 2;

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [teamFilter]);

    const flattenFormData = (data: Record<string, any>): Record<string, any> => {
        const out: Record<string, any> = {};
        if (data.chequeNo) out['Cheque No'] = data.chequeNo;
        if (data.chequeDate) out['Cheque Date'] = new Date(data.chequeDate).toLocaleDateString('en-GB');
        if (data.dueDate) out['Due Date'] = new Date(data.dueDate).toLocaleDateString('en-GB');
        if (data.payeeName) out['Payee Name'] = data.payeeName;
        if (data.amount) out['Amount'] = data.amount;
        if (data.utr) out['UTR'] = data.utr;
        if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
        if (data.issueDate) out['Issue Date'] = new Date(data.issueDate).toLocaleDateString('en-GB');
        if (data.expiryDate) out['Expiry Date'] = new Date(data.expiryDate).toLocaleDateString('en-GB');
        return out;
    };

    const { exportTab, setExportTab, exporting, handleExport, exportOptions } = useBiExport({
        getAllFn: (params) => chequesService.getAll(params),
        getActionFormDataFn: (id) => chequesService.getActionFormData(id),
        tabsConfig: TABS_CONFIG,
        pendingTabKey: 'cheque-pending',
        tabsWithForm: ['cheque-payable', 'cheque-paid-stop', 'cheque-for-security', 'cheque-for-dd-fdr', 'rejected', 'cancelled', 'expired'],
        filenamePrefix: 'cheques',
        flattenFormData,
        mapPendingRow: (r: any) => ({
            'Cheque Date': r.cheque ? new Date(r.cheque).toLocaleDateString('en-GB') : '',
            'Cheque No': r.chequeNo || '',
            'Payee name': r.payeeName || '',
            'Requested By': r.requestedBy || '',
            'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
            'Amount': r.amount || '',
            'Type': r.type || '',
            'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
            'Member': r.requestedBy || '',
            'Expiry': r.expiry || '',
            'Cheque Status': r.chequeStatus || '',
        }),
        mapRow: (r: any, isAllTab: boolean) => {
            const base: Record<string, any> = {
                'Cheque Date': r.cheque ? new Date(r.cheque).toLocaleDateString('en-GB') : '',
                'Cheque No': r.chequeNo || '',
                'Payee name': r.payeeName || '',
                'Requested By': r.requestedBy || '',
                'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
                'Amount': r.amount || '',
                'Type': r.type || '',
                'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
                'Member': r.requestedBy || '',
                'Expiry': r.expiry || '',
                'Cheque Status': r.chequeStatus || '',
            };
            if (isAllTab) base['Tab'] = r._tab || '';
            return base;
        },
    });

    const { data: apiResponse, isLoading, error } = useChequeDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
        team: teamId,
    });

    const { data: counts } = useChequeDashboardCounts();

    const chequeData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const chequeActions: ActionItem<ChequeDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: ChequeDashboardRow) => navigate(paths.bi.chequeView(row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: ChequeDashboardRow) => navigate(paths.bi.chequeAction(row.id)),
            },
            {
                label: 'Meeting Remarks',
                icon: <MessageSquare className="h-4 w-4" />,
                onClick: (row: ChequeDashboardRow) => navigate(paths.bi.chequeMeetingRemarks(row.id)),
            }
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<ChequeDashboardRow>[]>(
        () => [
            {
                field: 'tenderNo',
                colId: 'tenderNo',
                headerName: 'Tender Details',
                width: 200,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const data = params.data;
                    if (!data) return null;
                    if (data.tenderNo) {
                        return (
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs">{data.tenderName}</p>
                                <p className="text-xs text-[10px] text-muted-foreground truncate">{data.tenderNo}</p>
                            </div>
                        );
                    }
                    return <Badge variant="outline">{data.requestType || '—'}</Badge>;
                },
            },
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                width: 140,
                maxWidth: 130,
                colId: 'tenderStatus',
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'requestedBy',
                headerName: 'Requested By',
                width: 140,
                maxWidth: 140,
                colId: 'requestedBy',
                valueGetter: (params) => params.data?.requestedBy || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'cheque',
                headerName: 'Cheque Date',
                width: 130,
                colId: 'cheque',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
                comparator: (dateA, dateB) => {
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                },
                hide: activeTab === 'cheque-pending' || activeTab === 'rejected',
            },
            {
                field: 'chequeNo',
                headerName: 'Cheque No',
                width: 120,
                colId: 'chequeNo',
                valueGetter: (params) => params.data?.chequeNo || '—',
                sortable: true,
                filter: true,
                hide: activeTab === 'cheque-pending' || activeTab === 'rejected',
            },
            {
                field: 'payeeName',
                headerName: 'Payee name',
                maxWidth: 230,
                colId: 'payeeName',
                valueGetter: (params) => params.data?.payeeName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'bidValidity',
                headerName: 'Bid Validity',
                width: 120,
                maxWidth: 120,
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
                field: 'amount',
                headerName: 'Amount',
                width: 100,
                maxWidth: 100,
                colId: 'amount',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const amount = params.data?.amount;
                    if (!amount) return '—';
                    return <span className="text-right">{formatINR(parseFloat(amount.toString()))}</span>;
                },
            },
            {
                field: 'type',
                headerName: 'Type',
                width: 120,
                maxWidth: 120,
                colId: 'type',
                valueGetter: (params) => params.data?.type || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'dueDate',
                headerName: 'Due Date',
                width: 130,
                maxWidth: 130,
                colId: 'dueDate',
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
                field: 'expiry',
                headerName: 'Expiry',
                width: 120,
                maxWidth: 140,
                colId: 'expiry',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    if (status === 'No date') return <Badge variant="secondary">No date</Badge>;
                    if (status === 'Expired') return <Badge variant="destructive">Expired</Badge>;
                    return <Badge variant="default">{status}</Badge>;
                },
            },
            {
                field: 'chequeStatus',
                headerName: 'Cheque Status',
                width: 160,
                maxWidth: 160,
                colId: 'chequeStatus',
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
                cellRenderer: createActionColumnRenderer(chequeActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [chequeActions, activeTab]
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
                    <CardTitle>Cheques Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load cheques. Please try again later.
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
                            <CardTitle>Cheques Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage cheques for tenders.
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
                                <Button variant="outline" onClick={() => navigate(paths.tendering.oldEmdsForCHEQUE())}>
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
                        onValueChange={(value) => setActiveTab(value as ChequeDashboardTab)}
                    >
                        <TabsList className="m-auto mb-4">
                            {tabsWithData.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:shadow-md flex items-center gap-1"
                                >
                                    {tab.icon}
                                    <span className="font-semibold text-xs">{tab.name}</span>
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
                                        {(!chequeData || chequeData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} cheques</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={chequeData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No cheques found</span>',
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

export default ChequeListPage;
