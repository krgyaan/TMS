import { paths } from '@/app/routes/paths';
import { ExportExcelDropdown } from '@/components/bi-dashboard/ExportExcelDropdown';
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
import { useFdrDashboard, useFdrDashboardCounts } from '@/hooks/api/useFdrs';
import { useBiExport } from '@/hooks/useBiExport';

import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { fdrsService } from '@/services/api/fdrs.service';
import type { ColDef } from 'ag-grid-community';
import { AlertCircle, Clock, Edit, Eye, FileX2, Link, MessageSquare, Plus, RotateCcw, Search, Shield, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardTab, FdrDashboardRow } from './helpers/fdr.types';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';

const TABS_CONFIG: Array<{ key: DashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending FDRs',
    },
    {
        key: 'pnb-bg-linked',
        name: 'PNB BG linked',
        icon: <Link className="h-4 w-4" />,
        description: 'FDRs linked to PNB bank guarantees',
    },
    {
        key: 'ybl-bg-linked',
        name: 'YBL BG linked',
        icon: <Link className="h-4 w-4" />,
        description: 'FDRs linked to YBL bank guarantees',
    },
    {
        key: 'security-deposit',
        name: 'Security Deposit (SD)',
        icon: <Shield className="h-4 w-4" />,
        description: 'FDRs for security deposits',
    },
    {
        key: 'bond-linked',
        name: 'Bond linked',
        icon: <Link className="h-4 w-4" />,
        description: 'FDRs linked to bonds',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected FDRs',
    },
    {
        key: 'returned',
        name: 'Returned',
        icon: <RotateCcw className="h-4 w-4" />,
        description: 'Returned FDRs',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled FDRs',
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

const FdrListPage = () => {
    const {
        activeTab, setActiveTab,
        search, setSearch,
        debouncedSearch,
        pagination, setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'fdrs',
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
        if (data.fdrNo) out['FDR No'] = data.fdrNo;
        if (data.fdrDate) out['FDR Date'] = new Date(data.fdrDate).toLocaleDateString('en-GB');
        if (data.reqNo) out['Courier Req No'] = data.reqNo;
        if (data.fdrNeeds) out['Deliver By'] = data.fdrNeeds;
        if (data.fdrPurpose) out['Purpose Detail'] = data.fdrPurpose;
        if (data.fdrRemark) out['Remarks'] = data.fdrRemark;
        if (data.fdrSource) out['Source'] = data.fdrSource;
        if (data.fdrExpiryDate) out['FDR Expiry'] = new Date(data.fdrExpiryDate).toLocaleDateString('en-GB');
        if (data.utr) out['UTR'] = data.utr;
        if (data.issueDate) out['Issue Date'] = new Date(data.issueDate).toLocaleDateString('en-GB');
        if (data.expiryDate) out['Expiry Date'] = new Date(data.expiryDate).toLocaleDateString('en-GB');
        if (data.payableAt) out['Payable At'] = data.payableAt;
        if (data.favouring) out['Favouring'] = data.favouring;
        if (data.docketNo) out['Docket No'] = data.docketNo;
        return out;
    };

    const { exportTab, setExportTab, exporting, handleExport, exportOptions } = useBiExport({
        getAllFn: (params) => fdrsService.getAll(params),
        getExportDataFn: (params) => fdrsService.getExportData(params),
        tabsConfig: TABS_CONFIG,
        pendingTabKey: 'pending',
        tabsWithForm: ['pnb-bg-linked', 'ybl-bg-linked', 'security-deposit', 'bond-linked', 'rejected', 'returned', 'cancelled'],
        filenamePrefix: 'fdrs',
        flattenFormData,
        mapPendingRow: (r: any) => ({
            'Tender Name': r.projectName || '',
            'Tender No': r.projectNo || '',
            'FDR Date': r.fdrCreationDate ? new Date(r.fdrCreationDate).toLocaleDateString('en-GB') : '',
            'FDR No': r.fdrNo || '',
            'Beneficiary name': r.beneficiaryName || '',
            'FDR Amount': r.fdrAmount || '',
            'Tender Status': r.tenderStatus || '',
            'Member': r.member || '',
            'Expiry': r.expiry || '',
            'FDR Status': r.fdrStatus || '',
        }),
        mapRow: (r: any, isAllTab: boolean) => {
            const base: Record<string, any> = {
                'Tender Name': r.projectName || r.tenderName || '',
                'Tender No': r.tenderNo || r.projectNo || '',
                'FDR Date': r.fdrCreationDate ? new Date(r.fdrCreationDate).toLocaleDateString('en-GB') : '',
                'FDR No': r.fdrNo || '',
                'Beneficiary name': r.beneficiaryName || '',
                'FDR Amount': r.fdrAmount || '',
                'Tender Status': r.tenderStatus || '',
                'Member': r.member || '',
                'Expiry': r.expiry || '',
                'FDR Status': r.fdrStatus || '',
            };
            if (isAllTab) base['Tab'] = r._tab || '';
            return base;
        },
    });

    const { data: apiResponse, isLoading, error } = useFdrDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
        team: teamId,
    });

    const { data: counts } = useFdrDashboardCounts();

    const fdrData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const fdrActions: ActionItem<FdrDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: FdrDashboardRow) => navigate(paths.bi.fdrView(row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: FdrDashboardRow) => navigate(paths.bi.fdrAction(row.id)),
            },
            {
                label: 'Meeting Remarks',
                icon: <MessageSquare className="h-4 w-4" />,
                onClick: (row: FdrDashboardRow) => navigate(paths.bi.FdrMeetingRemarksPage(row.requestId)),
            }
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<FdrDashboardRow>[]>(
        () => [
            {
                field: 'fdrCreationDate',
                headerName: 'FDR Date',
                width: 110,
                colId: 'fdrCreationDate',
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
                field: 'fdrNo',
                headerName: 'FDR No',
                width: 130,
                colId: 'fdrNo',
                valueGetter: (params) => params.data?.fdrNo || '—',
                sortable: true,
                filter: true,
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
                field: 'fdrAmount',
                headerName: 'FDR Amount',
                width: 130,
                colId: 'fdrAmount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            tenderNameCol<FdrDashboardRow>('tenderNo', {
                field: 'tenderNo',
                headerName: 'Tender Name',
                width: 200,
                colId: 'tenderNo',
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
            },
            {
                field: 'member',
                headerName: 'Member',
                width: 120,
                colId: 'member',
                valueGetter: (params) => params.data?.member || '—',
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
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    if (status === 'No date') return <Badge variant="secondary">No date</Badge>;
                    if (status === 'Expired') return <Badge variant="destructive">Expired</Badge>;
                    return <Badge variant="default">{status}</Badge>;
                },
            },
            {
                field: 'fdrStatus',
                headerName: 'FDR Status',
                width: 130,
                colId: 'fdrStatus',
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
                cellRenderer: createActionColumnRenderer(fdrActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [fdrActions]
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
                    <CardTitle>FDR Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load FDRs. Please try again later.
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
                            <CardTitle>FDR Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage Fixed Deposit Receipts for tenders.
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
                                <Button variant="outline" onClick={() => navigate(paths.tendering.oldEmdsForFDR())}>
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
                                        {(!fdrData || fdrData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} FDRs</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={fdrData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No FDRs found</span>',
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

export default FdrListPage;
