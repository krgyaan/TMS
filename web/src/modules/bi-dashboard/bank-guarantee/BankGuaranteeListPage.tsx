import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileX2, Search, Eye, FileText, Shield, XCircle, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useBankGuaranteeDashboard, useBankGuaranteeDashboardCounts, useBankGuaranteeCardStats } from '@/hooks/api/useBankGuarantees';
import type { BankGuaranteeCardStats, BankGuaranteeDashboardRow, BankGuaranteeDashboardTab } from './helpers/bankGuarantee.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import BankStatsCards from './components/BankStatsCards';
import { paths } from '@/app/routes/paths';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const TABS_CONFIG: Array<{ key: BankGuaranteeDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'new-requests',
        name: 'New Requests',
        icon: <FileText className="h-4 w-4" />,
        description: 'New bank guarantee requests',
    },
    {
        key: 'live-yes',
        name: 'Live YES',
        icon: <Shield className="h-4 w-4" />,
        description: 'Live bank guarantees from YES Bank',
    },
    {
        key: 'live-pnb',
        name: 'Live PNB',
        icon: <Shield className="h-4 w-4" />,
        description: 'Live bank guarantees from PNB',
    },
    {
        key: 'live-bg-limit',
        name: 'Live BG Limit',
        icon: <Shield className="h-4 w-4" />,
        description: 'Live bank guarantees within limit',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled bank guarantees',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected bank guarantees',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('live') || statusLower.includes('active')) {
        return 'default';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
        return 'destructive';
    }
    return 'secondary';
};

const BankGuaranteeListPage = () => {
    const [activeTab, setActiveTab] = useState<BankGuaranteeDashboardTab>('new-requests');
    const navigate = useNavigate();
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);


    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

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

    const { data: apiResponse, isLoading, error } = useBankGuaranteeDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
    });

    const { data: counts } = useBankGuaranteeDashboardCounts();
    const { data: cardStats } = useBankGuaranteeCardStats();

    const bgData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const bgActions: ActionItem<BankGuaranteeDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: BankGuaranteeDashboardRow) => navigate(paths.bi.bankGuaranteeView(row.requestId)),
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: BankGuaranteeDashboardRow) => navigate(paths.bi.bankGuaranteeAction(row.id)),
            },
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<BankGuaranteeDashboardRow>[]>(
        () => [
            {
                field: 'bgDate',
                headerName: 'BG Date',
                width: 110,
                colId: 'bgDate',
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
                field: 'bgNo',
                headerName: 'BG No.',
                width: 130,
                colId: 'bgNo',
                valueGetter: (params) => params.data?.bgNo || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'beneficiaryName',
                headerName: 'Beneficiary name',
                width: 180,
                colId: 'beneficiaryName',
                valueGetter: (params) => params.data?.beneficiaryName || '—',
                sortable: true,
                filter: true,
            },
            tenderNameCol<BankGuaranteeDashboardRow>('tenderNo', {
                headerName: 'Tender Details',
                filter: true,
                width: 200,
            }),
            {
                field: 'bidValidity',
                headerName: 'Bid Validity',
                width: 110,
                colId: 'bidValidity',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
            },
            {
                field: 'amount',
                headerName: 'Amount',
                width: 110,
                colId: 'amount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'bgExpiryDate',
                headerName: 'Expiry Date',
                width: 110,
                colId: 'bgExpiryDate',
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
                field: 'bgClaimPeriod',
                headerName: 'BG Claim Period',
                width: 140,
                colId: 'bgClaimPeriod',
                valueGetter: (params) => {
                    const value = params.data?.bgClaimPeriod;
                    return value !== null && value !== undefined ? `${value} days` : '—';
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'bgChargesPaid',
                headerName: 'BG Charges paid',
                width: 100,
                colId: 'bgChargesPaid',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'bgChargesCalculated',
                headerName: 'BG Charges Calculated',
                width: 110,
                colId: 'bgChargesCalculated',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'fdrNo',
                headerName: 'FDR No',
                width: 100,
                colId: 'fdrNo',
                valueGetter: (params) => params.data?.fdrNo || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'fdrValue',
                headerName: 'FDR Value',
                width: 100,
                colId: 'fdrValue',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
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
                headerName: 'Expiry',
                width: 120,
                colId: 'expiryStatus',
                sortable: true,
                valueGetter: (params) => {
                    return params.data?.expiryStatus || '—';
                },
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status || status === '—') return '—';
                    const variant = status === 'Valid' ? 'default' : status === 'Claim Period' ? 'secondary' : 'destructive';
                    return <Badge variant={variant as any}>{status}</Badge>;
                },
            },
            {
                field: 'bgStatus',
                headerName: 'BG Status',
                width: 130,
                colId: 'bgStatus',
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
                cellRenderer: createActionColumnRenderer(bgActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [bgActions]
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
                    <CardTitle>Bank Guarantees Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load bank guarantees. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Bank Statistics Cards */}
            {cardStats && (
                <BankStatsCards cardStats={cardStats as BankGuaranteeCardStats} />
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Bank Guarantees Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage bank guarantees for tenders.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as BankGuaranteeDashboardTab)}
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
                            {/* Quick Filters (Left) - Optional, can be added per page */}

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
                                        {(!bgData || bgData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} bank guarantees</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={bgData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No bank guarantees found</span>',
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

export default BankGuaranteeListPage;
